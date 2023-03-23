import { select as d3_select } from 'd3-selection';

import { prefs } from '../core/preferences';
import { t, localizer } from '../core/localizer';
import { presetManager } from '../presets';
import { behaviorHash } from '../behavior';
import { utilDetect } from '../util/index.js';
import { uiFullScreen } from './full_screen.js';
import { utilGetDimensions } from '../util/index.js';
import { uiPhotoviewer } from './photoviewer.js';

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

    // HACK: Mobile Safari 14 likes to select anything selectable when long-
    // pressing, even if it's not targeted. This conflicts with long-pressing
    // to show the edit menu. We add a selectable offscreen element as the first
    // child to trick Safari into not showing the selection UI.
    overMap
      .append('div')
      .attr('class', 'select-trap')
      .text('t');

    // Map controls
    const controlsWrap = overMap
      .append('div')
      .attr('class', 'map-controls-wrap');

    const controls = controlsWrap
      .append('div')
      .attr('class', 'map-controls');

    map.redrawEnable(true);
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

  ui.photoviewer = uiPhotoviewer(context);

  ui.onResize = function(withPan) {
    const map = context.map();

    // Recalc dimensions of map and sidebar.. (`true` = force recalc)
    // This will call `getBoundingClientRect` and trigger reflow,
    //  but the values will be cached for later use.
    const mapDimensions = utilGetDimensions(context.container().select('.main-content'), true);
    utilGetDimensions(context.container().select('.sidebar'), true);

    if (withPan !== undefined) {
      map.redrawEnable(false);
      map.pan(withPan);
      map.redrawEnable(true);
    }
    map.dimensions(mapDimensions);

    ui.photoviewer.onMapResize();

    // check if header or footer have overflowed
    ui.checkOverflow('.top-toolbar');
    ui.checkOverflow('.map-footer-bar');

    // Use outdated code so it works on Explorer
    const resizeWindowEvent = document.createEvent('Event');

    resizeWindowEvent.initEvent('resizeWindow', true, true);

    document.dispatchEvent(resizeWindowEvent);
  };

  // Call checkOverflow when resizing or whenever the contents change.
  ui.checkOverflow = function (selector, reset) {
    if (reset) {
      delete _needWidth[selector];
    }
    const selection = context.container().select(selector);
    if (selection.empty()) return;
    const scrollWidth = selection.property('scrollWidth');
    const clientWidth = selection.property('clientWidth');
    const needed = _needWidth[selector] || scrollWidth;
    if (scrollWidth > clientWidth) {    // overflow happening
      selection.classed('narrow', true);
      if (!_needWidth[selector]) {
        _needWidth[selector] = scrollWidth;
      }
    }
    else if (scrollWidth >= needed) {
      selection.classed('narrow', false);
    }
  }

  return ui;

}
