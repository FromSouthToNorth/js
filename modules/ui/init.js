import { select as d3_select } from 'd3-selection';
import { localizer } from '../core/localizer';
import { presetManager } from '../presets';
import { behaviorHash } from '../behavior';

import { utilGetDimensions } from '../util/index.js';
import { uiCmd } from './cmd.js';
import { uiFlash } from './flash.js';
import { uiZoom } from './zoom.js';
import { svgDefs } from '../svg/index.js';
import { uiAttribution } from './attribution.js';

export function uiInit(context) {

  function render(container) {

    container.attr('lang', localizer.localeCode()).
        attr('dir', localizer.textDirection());

    const map = context.map();
    map.redrawEnable(false); // don't draw until we've set zoom/lat/long

    container.append('svg').attr('id', 'ideditor-defs').call(ui.svgDefs);

    const content = container.append('div').
        attr('class', 'main-content active');

    content.append('div').
        attr('class', 'main-map').
        attr('dir', 'ltr').
        call(map);

    const overMap = content.append('div').attr('class', 'over-map');

    overMap.append('div').
        attr('class', 'attribution-wrap').
        attr('dir', 'ltr').
        call(uiAttribution(context));

    const controlsWrap = overMap.append('div').
        attr('class', 'map-controls-wrap');

    const controls = controlsWrap.append('div').attr('class', 'map-controls');

    controls.append('div').
        attr('class', 'map-control zoombuttons').
        call(uiZoom(context));

    ui.onResize();
    map.redrawEnable(true);

    ui.hash = behaviorHash(context);
    ui.hash();
    if (!ui.hash.hadLocation) {
      map.centerZoom([0, 0], 2);
    }

    d3_select(window).on('resize.editor', function() {
      ui.onResize();
    });

    const panPixels = 80;
    context.keybinding().
        on('←', pan([panPixels, 0])).
        on('↑', pan([0, panPixels])).
        on('→', pan([-panPixels, 0])).
        on('↓', pan([0, -panPixels])).
        on(uiCmd('⌥←'), pan([map.dimensions()[0], 0])).
        on(uiCmd('⌥↑'), pan([0, map.dimensions()[1]])).
        on(uiCmd('⌥→'), pan([-map.dimensions()[0], 0])).
        on(uiCmd('⌥↓'), pan([0, -map.dimensions()[1]]));

    function pan(d) {
      return function(d3_event) {
        if (d3_event.shiftKey) return;
        if (context.container().select('.combobox').size()) return;
        d3_event.preventDefault();
        context.map().pan(d, 100);
      };
    }

    function zoomInFurther(d3_event) {
      if (d3_event.shiftKey) return;
      d3_event.preventDefault();
      context.map().zoomInFurther();
    }

    function zoomOutFurther(d3_event) {
      if (d3_event.shiftKey) return;
      d3_event.preventDefault();
      context.map().zoomOutFurther();
    }

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

  ui.svgDefs = svgDefs(context);

  ui.flash = uiFlash(context);

  return ui;

}
