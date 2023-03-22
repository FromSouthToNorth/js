import { select as d3_select } from 'd3-selection';
import { dispatch as d3_dispatch } from 'd3-dispatch';
import { utilKeybinding, utilRebind, utilStringQs } from '../util/index.js';
import packageJSON from '../../package.json';
import { geoRawMercator } from '../geo/index.js';
import { rendererMap } from '../renderer/index.js';
import { services } from '../services/index.js';

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
  context.defaultChangesetComment = function(val) {
    if (!arguments.length) return _defaultChangesetComment;
    _defaultChangesetComment = val;
    return context;
  };
  context.defaultChangesetSource = function(val) {
    if (!arguments.length) return _defaultChangesetSource;
    _defaultChangesetSource = val;
    return context;
  };
  context.defaultChangesetHashtags = function(val) {
    if (!arguments.length) return _defaultChangesetHashtags;
    _defaultChangesetHashtags = val;
    return context;
  };

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

  let _minEditableZoom = 16;
  context.minEditableZoom = function(val) {
    if (!arguments.length) return _minEditableZoom;
    _minEditableZoom = val;
    if (_connection) {
      _connection.tileZoom(val);
    }
    return context;
  };

  /* Projections */
  context.projection = geoRawMercator();
  context.curtainProjection = geoRawMercator();

  context.init = () => {
    instantiateInternal();
    return context;

    function instantiateInternal() {
      _map = rendererMap(context);
    }
  };

  return context;
}
