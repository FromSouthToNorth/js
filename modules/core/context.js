import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import packageJSON from '../../package.json';

import { fileFetcher } from './file_fetcher';
import { localizer } from './localizer';
import { coreHistory } from './history';
import { geoRawMercator } from '../geo/index.js';
import {
  rendererBackground,
  rendererMap,
} from '../renderer';
import { services } from '../services';
import { uiInit } from '../ui/init';
import {
  utilKeybinding,
  utilRebind,
} from '../util';
import { modeSelect } from '../modes/index.js';

export function coreContext() {
  const dispatch = d3_dispatch('enter', 'exit', 'change');
  let context = utilRebind({}, dispatch, 'on');

  context.version = packageJSON.version;
  context.privacyVersion = '20201202';

  /* Document title */
  /* (typically shown as the label for the browser window/tab) */

  // If true, iD will update the title based on what the user is doing
  let _setsDocumentTitle = true;
  context.setsDocumentTitle = function(val) {
    if (!arguments.length) return _setsDocumentTitle;
    _setsDocumentTitle = val;
    return context;
  };
  // The part of the title that is always the same
  let _documentTitleBase = document.title;
  context.documentTitleBase = function(val) {
    if (!arguments.length) return _documentTitleBase;
    _documentTitleBase = val;
    return context;
  };

  /* User interface and keybinding */
  let _ui;
  context.ui = () => _ui;

  /* 按键绑定 */
  let _keybinding = utilKeybinding('context');
  context.keybinding = () => _keybinding;
  d3_select(document)
    .call(_keybinding);

  /* Straight accessors. Avoid using these if you can. */
  // Instantiate the connection here because it doesn't require passing in
  // `context` and it's needed for pre-init calls like `preauth`
  let _connection = services.osm;
  let _history;
  context.connection = () => _connection;
  context.history = () => _history;

  /* Connection */

  // A string or array or locale codes to prefer over the browser's settings
  context.locale = function(locale) {
    if (!arguments.length) return localizer.localeCode();
    localizer.preferredLocaleCodes(locale);
    return context;
  };

  function afterLoad(cid, callback) {
    return (err, result) => {
      if (err) {
        // 400 Bad Request, 401 Unauthorized, 403 Forbidden..
        if (err.status === 400 || err.status === 401 || err.status === 403) {
          if (_connection) {
            _connection.logout();
          }
        }
        if (typeof callback === 'function') {
          callback(err);
        }
      }
      else if (_connection && _connection.getConnectionId() !== cid) {
        if (typeof callback === 'function') {
          callback({ message: 'Connection Switched', status: -1 });
        }
      }
      else {
        _history.merge(result.data, result.extent);
        if (typeof callback === 'function') {
          callback(err, result);
        }
      }
    };
  }

  // Download the full entity and its parent relations. The callback may be called multiple times.
  context.loadEntity = (entityID, callback) => {
    if (_connection) {
      const cid = _connection.getConnectionId();
      _connection.loadEntity(entityID, afterLoad(cid, callback));
      // We need to fetch the parent relations separately.
      _connection.loadEntityRelations(entityID, afterLoad(cid, callback));
    }
  };

  context.zoomToEntity = (entityID, zoomTo) => {

    // be sure to load the entity even if we're not going to zoom to it
    context.loadEntity(entityID, (err, result) => {
      if (err) return;
      if (zoomTo !== false) {
        const entity = result.data.find(e => e.id === entityID);
        if (entity) {
          _map.zoomTo(entity);
        }
      }
    });

    _map.on('drawn.zoomToEntity', () => {
      if (!context.hasEntity(entityID)) return;
      _map.on('drawn.zoomToEntity', null);
      context.on('enter.zoomToEntity', null);
      context.enter(modeSelect(context, [entityID]));
    });

    context.on('enter.zoomToEntity', () => {
      if (_mode.id !== 'browse') {
        _map.on('drawn.zoomToEntity', null);
        context.on('enter.zoomToEntity', null);
      }
    });
  };

  /* History */
  let _inIntro = false;
  context.inIntro = function(val) {
    if (!arguments.length) return _inIntro;
    _inIntro = val;
    return context;
  };

  /* Graph */
  context.hasEntity = (id) => _history.graph()
    .hasEntity(id);
  context.entity = (id) => _history.graph()
    .entity(id);

  /* Modes */
  let _mode;
  context.mode = () => _mode;
  context.enter = (newMode) => {
    if (_mode) {
      _mode.exit();
      dispatch.call('exit', this, _mode);
    }

    _mode = newMode;
    _mode.enter();
    dispatch.call('enter', this, _mode);
  };

  context.selectedIDs = () => (_mode && _mode.selectedIDs &&
    _mode.selectedIDs()) || [];
  context.activeID = () => _mode && _mode.activeID && _mode.activeID();

  let _selectedNoteID;
  context.selectedNoteID = function(noteID) {
    if (!arguments.length) return _selectedNoteID;
    _selectedNoteID = noteID;
    return context;
  };

  /* Background */
  let _background;
  context.background = () => _background;

  /* Features */
  let _features;
  context.features = () => _features;
  context.hasHiddenConnections = (id) => {
    const graph = _history.graph();
    const entity = graph.entity(id);
    return _features.hasHiddenConnections(entity, graph);
  };

  /* Map */
  let _map;
  context.map = () => _map;
  context.layers = () => _map.layers();
  context.surface = () => _map.surface;

  /* Debug */
  let _debugFlags = {
    tile: false,        // tile boundaries
    collision: false,   // label collision bounding boxes
    imagery: false,     // imagery bounding polygons
    target: false,      // touch targets
    downloaded: false,   // downloaded data from osm
  };
  context.debugFlags = () => _debugFlags;
  context.getDebug = (flag) => flag && _debugFlags[flag];
  context.setDebug = function(flag, val) {
    if (arguments.length === 1) val = true;
    _debugFlags[flag] = val;
    dispatch.call('change');
    return context;
  };

  /* Container */
  let _container = d3_select(null);
  context.container = function(val) {
    if (!arguments.length) return _container;
    _container = val;
    _container.classed('ideditor', true);
    return context;
  };
  context.containerNode = function(val) {
    if (!arguments.length) return context.container()
      .node();
    context.container(d3_select(val));
    return context;
  };

  /* Assets */
  let _assetPath = '';
  context.assetPath = function(val) {
    if (!arguments.length) return _assetPath;
    _assetPath = val;
    fileFetcher.assetPath(val);
    return context;
  };

  let _assetMap = {};
  context.assetMap = function(val) {
    if (!arguments.length) return _assetMap;
    _assetMap = val;
    fileFetcher.assetMap(val);
    return context;
  };

  context.asset = (val) => {
    if (/^http(s)?:\/\//i.test(val)) return val;
    const filename = _assetPath + val;
    return _assetMap[filename] || filename;
  };

  context.imagePath = (val) => context.asset(`img/${val}`);

  /* Projections */
  context.projection = geoRawMercator();
  context.curtainProjection = geoRawMercator();

  /* Init */
  context.init = () => {

    instantiateInternal();

    initializeDependents();

    return context;

    // Load variables and properties. No property of `context` should be accessed
    // until this is complete since load statuses are indeterminate. The order
    // of instantiation shouldn't matter.
    function instantiateInternal() {

      _history = coreHistory(context);

      _background = rendererBackground(context);
      _map = rendererMap(context);

      _ui = uiInit(context);
    }

    // Set up objects that might need to access properties of `context`. The order
    // might matter if dependents make calls to each other. Be wary of async calls.
    function initializeDependents() {
      _background.ensureLoaded();

      Object.values(services)
        .forEach(service => {
          if (service && typeof service.init === 'function') {
            service.init();
          }
        });

      _map.init();

      // if the container isn't available, e.g. when testing, don't load the UI
      if (!context.container()
        .empty()) {
        _ui.ensureLoaded()
          .then(() => {
            _background.init();
          });
      }
    }
  };

  return context;
}
