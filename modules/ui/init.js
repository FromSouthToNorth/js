import { select as d3_select } from 'd3-selection';

import { prefs } from '../core/preferences';
import { t, localizer } from '../core/localizer';
import { presetManager } from '../presets';
import { behaviorHash } from '../behavior';
import * as os from 'os';
import { utilDetect } from '../util/index.js';
import { uiFullScreen } from './full_screen.js';

export function uiInit(context) {
  let _initCounter = 0;
  let _needWidth = {};

  let _lastPointerType;


  function render(container) {

    container.on('click.ui', function (d3_event) {
      if (d3_event.button !== 0) return;
      if (!d3_event.composedPath) return;

      // some targets have default click events we don't want to override
      const isOkayTarget = d3_event.composedPath().some(function (node) {
        // we only care about element nodes
        return node.nodeType === 1 &&
          // clicking <input> focuses it and/or changes a value
          (node.nodeName === 'INPUT' ||
            // clicking <label> affects its <input> by default
            node.nodeName === 'LABEL' ||
            // clicking <a> opens a hyperlink by default
            node.nodeName === 'A');
      });
      if (isOkayTarget) return;

      d3_event.preventDefault();
    });

    const detected = utilDetect();

    // only WebKit supports gesture events
    if ('GestureEvent ' in window &&
      // Listening for gesture events on iOS 13.4+ breaks double-tapping,
      // but we only need to do this on desktop Safari anyway. – #7694
      !detected.isMobileWebKit) {

      // On iOS we disable pinch-to-zoom of the UI via the `touch-action`
      // CSS property, but on desktop Safari we need to manually cancel the
      // default gesture events.
      container.on('gesturestart.ui gesturechange.ui gestureend.ui', function (d3_event) {
        // disable pinch-to-zoom of the UI via multitouch trackpads on macOS Safari
        d3_event.preventDefault();
      });
    }

    if ('PointerEvent' in window) {
      d3_select(window)
        .on('pointerdown.ui pointerup.ui', function (d3_event) {
          const pointerType = d3_event.pointerType || 'mouse';
          if (_lastPointerType !== pointerType) {
            _lastPointerType = pointerType;
            container
              .attr('pointer', pointerType);
          }
        }, true);
    }
    else {
      _lastPointerType = 'mouse';
      container
        .attr('pointer', 'mouse');
    }

    container
      .attr('lang', localizer.localeCode())
      .attr('dir', localizer.textDirection());

    // setup fullscreen keybindings (no button shown at this time)
    container
      .call(uiFullScreen(context));

    const map = context.map();
    map.redrawEnable(false); // don't draw until we've set zoom/lat/long

    map
      .on('hitMinZoom.ui', function () {
        // ui.flash
        //   .iconName('#iD-icon-no')
        //   .label(t.append('cannot_zoom'))();
      });

    container
      .append('svg')
      .attr('id', 'ideditor-defs');
    // .call(ui.svgDefs);

    container
      .append('div')
      .attr('class', 'sidebar');
    // .call(ui.sidebar);

    const content = container
      .append('div')
      .attr('class', 'main-content active');

    // Top toolbar
    content
      .append('div')
      .attr('class', 'top-toolbar-wrap')
      .append('div')
      .attr('class', 'top-toolbar fillD');
    // .call(uiTopToolbar(context));

    content
      .append('div')
      .attr('class', 'main-map')
      .attr('dir', 'ltr')
      .call(map);

    const overMap = content
      .append('div')
      .attr('class', 'over-map');
  }

  let ui = {};

  let _loadPromise;
  // renders the iD interface into the container node
  ui.ensureLoaded = () => {
    if (_loadPromise) return _loadPromise;
    return _loadPromise = Promise.all([
      localizer.ensureLoaded(),
      presetManager.ensureLoaded(),
    ])
      .then(() => {
        if (!context.container().empty()) {
          render(context.container());
        }
      })
      .catch(err => console.error(err)); // eslint-disable-line
  };

  return ui;

}