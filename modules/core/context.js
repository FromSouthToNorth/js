import _debounce from 'lodash-es/debounce.js';

import { select as d3_select } from 'd3-selection';
import { dispatch as d3_dispatch } from 'd3-dispatch';

import packageJSON from '../../package.json';

import { t } from './localizer.js';

import { utilCleanOsmString, utilKeybinding, utilRebind, utilStringQs } from '../util/index.js';
import { geoRawMercator } from '../geo/index.js';
import { rendererFeatures, rendererMap } from '../renderer/index.js';
import { services } from '../services/index.js';
import { coreHistory } from './history.js';

export function coreContext() {
  const dispatch = d3_dispatch('enter', 'exit', 'change');
  let context = utilRebind({}, dispatch, 'on');
  let _deferred = new Set();

  context.version = packageJSON.version;
  context.privacyVersion = '2023年3月16日14:36:47';

  // iD will alter the hash so cache the parameters intended to setup the session
  context.initialHashParams = window.location.hash ? utilStringQs(window.location.hash) : {};

  /* Changeset */
  // An osmChangeset object. Not loaded until needed.
  context.changest = null;

  let _defaultChangesetComment = context.initialHashParams.comment;
  let _defaultChangesetSource = context.initialHashParams.source;
  let _defaultChangesetHashtags = context.initialHashParams.hashtags;
  context.defaultChangesetComment = function (val) {
    if (!arguments.length) return _defaultChangesetComment;
    _defaultChangesetComment = val;
    return context;
  };
  context.defaultChangesetSource = function (val) {
    if (!arguments.length) return _defaultChangesetSource;
    _defaultChangesetSource = val;
    return context;
  };
  context.defaultChangesetHashtags = function (val) {
    if (!arguments.length) return _defaultChangesetHashtags;
    _defaultChangesetHashtags = val;
    return context;
  };

  /* Document title */
  /* (typically shown as the label for the browser window/tab) */

  // If true, iD will update the title based on what the user is doing
  let _setsDocumentTitle = true;
  context.setsDocumentTitle = function (val) {
    if (!arguments.length) return _setsDocumentTitle;
    _setsDocumentTitle = val;
    return context;
  };
  // The part of the title that is always the same
  let _documentTitleBase = document.title;
  context.documentTitleBase = function (val) {
    if (!arguments.length) return _documentTitleBase;
    _documentTitleBase = val;
    return context;
  };

  /* User interface and keybinding */
  let _ui;
  context.ui = () => _ui;
  context.lastPointerType = () => _ui.lastPointerType();

  let _keybinding = utilKeybinding('context');
  context.keybinding = () => _keybinding;
  d3_select(document).call(_keybinding);

  /* Straight accessors. Avoid using these if you can. */
  // Instantiate the connection here because it doesn't require passing in
  // `context` and it's needed for pre-init calls like `preauth`
  let _connection = services.osm;
  let _history;
  let _validator;
  let _uploader;
  context.connection = () => _connection;
  context.history = () => _history;
  context.validator = () => _validator;
  context.uploader = () => _uploader;

  let _minEditableZoom = 16;
  context.minEditableZoom = function (val) {
    if (!arguments.length) return _minEditableZoom;
    _minEditableZoom = val;
    if (_connection) {
      _connection.tileZoom(val);
    }
    return context;
  };

  // String length limits in Unicode characters, not JavaScript UTF-16 code units
  context.maxCharsForTagKey = () => 255;
  context.maxCharsForTagValue = () => 255;
  context.maxCharsForRelationRole = () => 255;

  context.cleanTagKey = (val) => utilCleanOsmString(val, context.maxCharsForTagKey());
  context.cleanTagValue = (val) => utilCleanOsmString(val, context.maxCharsForTagValue());
  context.cleanRelationRole = (val) => utilCleanOsmString(val, context.maxCharsForRelationRole());

  /* History */
  let _inIntro = false;
  context.inIntro = function (val) {
    if (!arguments.length) return _inIntro;
    _inIntro = val;
    return context;
  };

  // Immediately save the user's history to localstorage, if possible
  // This is called someteimes, but also on the `window.onbeforeunload` handler
  context.save = () => {
    // no history save, no message onbeforeunload
    if (_inIntro || context.container().select('.modal').size()) return;

    let canSave;
    if (_mode && _mode.id === 'save') {
      canSave = false;

      // Attempt to prevent user from creating duplicate changes - see #5200
      if (services.osm && services.osm.isChangesetInflight()) {
        _history.clearSaved();
        return;
      }

    } else {
      canSave = context.selectedIDs().every(id => {
        const entity = context.hasEntity(id);
        return entity && !entity.isDegenerate();
      });
    }

    if (canSave) {
      _history.save();
    }
    if (_history.hasChanges()) {
      return t('save.unsaved_changes');
    }
  };


  // Debounce save, since it's a synchronous localStorage write,
  // and history changes can happen frequently (e.g. when dragging).
  context.debouncedSave = _debounce(context.save, 350);

  function withDebouncedSave(fn) {
    return function () {
      const result = fn.apply(_history, arguments);
      context.debouncedSave();
      return result;
    };
  }

  /* Graph */
  context.hasEntity = (id) => _history.graph().hasEntity(id);
  context.entity = (id) => _history.graph().entity(id);

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

  /* Features */
  let _features;
  context.features = () => _features;
  context.hasHiddenConnections = (id) => {
    const graph = _history.graph();
    const entity = graph.entity(id);
    return _features.hasHiddenConnections(entity, graph);
  };

  /** Map */
  let _map;
  context.map = () => _map;
  context.layers = () => _map.layers();
  context.surface = () => _map.surface;

  /* Container */
  let _container = d3_select(null);
  context.container = function (val) {
    if (!arguments.length) return _container;
    _container = val;
    _container.classed('ideditor', true);
    return context;
  };
  context.containerNode = function (val) {
    if (!arguments.length) return context.container().node();
    context.container(d3_select(val));
    return context;
  };

  /* Projections */
  context.projection = geoRawMercator();
  context.curtainProjection = geoRawMercator();

  context.init = () => {
    instantiateInternal();
    initializeDependents();
    return context;

    // Load variables and properties. No property of `context` should be accessed
    // until this is complete since load statuses are indeterminate. The order
    // of instantiation shouldn't matter.
    function instantiateInternal() {
      _history = coreHistory(context);
      context.graph = _history.graph;
      context.pauseChangeDispatch = _history.pauseChangeDispatch;
      context.resumeChangeDispatch = _history.resumeChangeDispatch;
      context.perform = withDebouncedSave(_history.perform);
      context.replace = withDebouncedSave(_history.replace);
      context.pop = withDebouncedSave(_history.pop);
      context.overwrite = withDebouncedSave(_history.overwrite);
      context.undo = withDebouncedSave(_history.undo);
      context.redo = withDebouncedSave(_history.redo);

      _features = rendererFeatures(context);
      _map = rendererMap(context);
    }

    function initializeDependents() {
    }
  };

  return context;
}
