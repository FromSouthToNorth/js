import { select as d3_select } from 'd3-selection';
import { localizer, t } from '../core/localizer';
import { presetManager } from '../presets';
import { behaviorHash } from '../behavior';

import { utilGetDimensions } from '../util/index.js';
import { uiCmd } from './cmd.js';
import { uiZoom } from './zoom.js';
import { svgDefs } from '../svg/index.js';
import { uiAttribution } from './attribution.js';
import { uiPaneBackground } from './panes/index.js';

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

    // HACK: Mobile Safari 14 likes to select anything selectable when long-
    // pressing, even if it's not targeted. This conflicts with long-pressing
    // to show the edit menu. We add a selectable offscreen element as the first
    // child to trick Safari into not showing the selection UI.
    overMap.append('div').attr('class', 'select-trap').text('t');

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

    // Add panes
    // This should happen after map is initialized, as some require surface()
    const panes = overMap.append('div').attr('class', 'map-panes');

    const uiPanes = [
      uiPaneBackground(context),
    ];

    uiPanes.forEach(function(pane) {
      controls.append('div').
      attr('class', 'map-control map-pane-control ' + pane.id + '-control').
      call(pane.renderToggleButton);

      panes.call(pane.renderPane);
    });

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

  ui.togglePanes = function(showPane) {
    let hidePanes = context.container().selectAll('.map-pane.shown');

    let side = localizer.textDirection() === 'ltr' ? 'right' : 'left';

    hidePanes.classed('shown', false).classed('hide', true);

    context.container().
    selectAll('.map-pane-control button').
    classed('active', false);

    if (showPane) {
      hidePanes.classed('shown', false).
      classed('hide', true).
      style(side, '-500px');

      context.container().
      selectAll('.' + showPane.attr('pane') + '-control button').
      classed('active', true);

      showPane.classed('shown', true).classed('hide', false);
      if (hidePanes.empty()) {
        showPane.style(side, '-500px').
        transition().
        duration(200).
        style(side, '0px');
      }
      else {
        showPane.style(side, '0px');
      }
    }
    else {
      hidePanes.classed('shown', true).
      classed('hide', false).
      style(side, '0px').
      transition().
      duration(200).
      style(side, '-500px').
      on('end', function() {
        d3_select(this).classed('shown', false).classed('hide', true);
      });
    }
  };

  ui.svgDefs = svgDefs(context);

  return ui;

}
