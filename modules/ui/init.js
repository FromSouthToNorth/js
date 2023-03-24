import { select as d3_select } from 'd3-selection';
import { localizer } from '../core/localizer';
import { presetManager } from '../presets';
import { behaviorHash } from '../behavior';

import { utilGetDimensions } from '../util/index.js';

export function uiInit(context) {

  function render(container) {

    const map = context.map();
    map.redrawEnable(false); // don't draw until we've set zoom/lat/long

    const content = container.append('div').
    attr('class', 'main-content active');

    content.append('div').
    attr('class', 'main-map').
    attr('dir', 'ltr').
    call(map);

    map.redrawEnable(true);

    ui.hash = behaviorHash(context);
    ui.hash();
    if (!ui.hash.hadLocation) {
      map.centerZoom([0, 0], 2);
    }

    d3_select(window).on('resize.editor', function() {
      ui.onResize();
    });
  }

  let ui = {};

  let _loadPromise;
  // renders the iD interface into the container node
  ui.ensureLoaded = () => {
    if (_loadPromise) return _loadPromise;
    return _loadPromise = Promise.all([
      localizer.ensureLoaded(),
      presetManager.ensureLoaded(),
    ]).then(() => {
      if (!context.container().empty()) {
        render(context.container());
      }
    }).catch(err => console.error(err)); // eslint-disable-line
  };

  ui.onResize = function(withPan) {
    let map = context.map();

    const mapDimensions = utilGetDimensions(
        context.container().select('.main-content'), true);

    if (withPan) {
    }
    map.dimensions(mapDimensions);

    // Use outdated code so it works on Explorer
    const resizeWindowEvent = document.createEvent('Event');

    resizeWindowEvent.initEvent('resizeWindow', true, true);

    document.dispatchEvent(resizeWindowEvent);
  };

  return ui;

}
