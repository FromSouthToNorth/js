import * as d3 from 'd3';
import { utilKeybinding, utilRebind, utilStringQs } from '../util/index.js';
import packageJSON from '../../package.json';

export function coreContext() {
  const dispatch = d3.dispatch('enter', 'exit', 'change');
  let context = utilRebind({}, dispatch, 'on');
  let _deferred = new Set();
  context.version = packageJSON.version;
  context.privacyVersion = '2023年3月16日14:36:47';

  // will alter the hash so cache the parameters intended to setup the session
  context.initialHashParams = window.location.hash ? utilStringQs(window.location.hash) : {};

  // Changeset
  context.changeset = null;
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

  /* 用户界面和键绑定 */
  let _ui;
  context.ui = () => _ui;
  context.lastPointerType = () => _ui.lastPointerType();

  let _keybinding = utilKeybinding('context');
  context.keybinding = () => _keybinding;
  d3.select(document).call(_keybinding);

  return context;
}
