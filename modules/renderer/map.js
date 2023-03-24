import _throttle from 'lodash-es/throttle';

import { zoom as d3_zoom, zoomIdentity as d3_zoomIdentity } from 'd3-zoom';
import { select as d3_select } from 'd3-selection';
import { dispatch as d3_dispatch } from 'd3-dispatch';
import { interpolate as d3_interpolate } from 'd3-interpolate';
import { scaleLinear as d3_scaleLinear } from 'd3-scale';

import {
  utilBindOnce,
  utilDetect,
  utilDoubleUp, utilEntityAndDeepMemberIDs,
  utilFastMouse, utilFunctor,
  utilGetDimensions,
  utilRebind,
  utilSetTransform,
  utilZoomPan,
} from '../util/index.js';

import {
  geoExtent,
  geoRawMercator,
  geoScaleToZoom,
  geoZoomToScale,
} from '../geo/index.js';

import { prefs } from '../core/index.js';
import { svgLabels, svgLayers, svgVertices } from '../svg/index.js';

/** constants */
const TILESIZE = 256;
const minZoom = 2;
const maxZoom = 24;
// const zoomSnap = 0.2;
const kMin = geoZoomToScale(minZoom, TILESIZE);
const kMax = geoZoomToScale(maxZoom, TILESIZE);

function clamp(num, min, max) {
  return Math.max(min, Math.min(num, max));
}

export function rendererMap(context) {
  const dispatch = d3_dispatch('move', 'drawn', 'crossEditableZoom',
      'hitMinZoom', 'changeHighlighting', 'changeAreaFill');
  const projection = context.projection;
  const curtainProjection = context.curtainProjection;
  let drawLayers;
  let drawPoints;
  let drawVertices;
  let drawLines;
  let drawAreas;
  let drawMidpoints;
  let drawLabels;

  let _selection = d3_select(null);
  let supersurface = d3_select(null);
  let wrapper = d3_select(null);
  let surface = d3_select(null);

  let _dimensions = [1, 1];
  let _dblClickZoomEnabled = true; // 双击启用缩放
  let _redrawEnabled = true; // 启用重绘
  let _gestureTransformStart;
  let _transformStart = projection.transform();
  let _transformLast;
  let _isTransformed = false;
  let _minZoom = 0;
  let _getMouseCoords;
  let _lastPointerEvent;
  let _lastWithinEditableZoom;

  // pointerdown 事件是否开始缩放
  let _pointerDown = false;

  // 如果支持，使用指针事件交互; 回退到 d3-zoom 中的触摸/鼠标事件
  let _pointerPrefix = 'PointerEvent' in window ? 'pointer' : 'mouse';

  // 如果支持，使用指针事件交互；回退到 d3-zoom 中的触摸/鼠标事件
  let _zoomerPannerFunction = 'PointerEvent' in window ? utilZoomPan : d3_zoom;

  let _zoomerPanner = _zoomerPannerFunction().
      scaleExtent([kMin, kMax]).
      interpolate(d3_interpolate).
      filter(zoomEventFilter).
      on('zoom.map', zoomPan).
      on('start.map', function(d3_event) {
        _pointerDown = d3_event && (d3_event.type === 'pointerdown' ||
            (d3_event.sourceEvent && d3_event.sourceEvent.type ===
                'pointerdown'));
      }).
      on('end.map', function() {
        _pointerDown = false;
      });

  const _doubleUpHandler = utilDoubleUp();

  const scheduleRedraw = _throttle(redraw, 750);

  function cancelPendingRedraw() {
    scheduleRedraw.cancel();
    // isRedrawScheduled = false;
    // window.cancelIdleCallback(pendingRedrawCall);
  }

  function map(selection) {
    _selection = selection;
    context.on('change.map', immediateRedraw);
    const osm = context.connection();
    if (osm) {
      osm.on('change.map', immediateRedraw);
    }

    function didUndoOrRedo(targetTransform) {
      const mode = context.mode().id;
      if (mode !== 'browse' && mode !== 'select') {
        return;
      }
      if (targetTransform) {
        map.transformEase(targetTransform);
      }
    }

    context.history().
        on('merge.map', function() {
          scheduleRedraw();
        }).
        on('change.map', immediateRedraw).
        on('undone.map', function(stack, fromStack) {
          didUndoOrRedo(fromStack.transform);
        }).
        on('redone.map', function(stack) {
          didUndoOrRedo(stack.transform);
        });

    context.background().on('change.map', immediateRedraw);

    context.features().on('redraw.map', immediateRedraw);

    drawLayers.on('change.map', function() {
      context.background().updateImagery();
      immediateRedraw();
    });

    selection.on('wheel.map mousewheel.map', function(d3_event) {
      // disable swipe-to-navigate browser pages on trackpad/magic mouse – #5552
      d3_event.preventDefault();
    }).
        call(_zoomerPanner).
        call(_zoomerPanner.transform, projection.transform()).
        on('dblclick.zoom', null); // override d3-zoom dblclick handling

    map.supersurface = supersurface = selection.append('div').
        attr('class', 'supersurface').
        call(utilSetTransform, 0, 0);

    // Need a wrapper div because Opera can't cope with an absolutely positioned
    // SVG element: http://bl.ocks.org/jfirebaugh/6fbfbd922552bf776c16
    wrapper = supersurface.append('div').attr('class', 'layer layer-data');

    map.surface = surface = wrapper.call(drawLayers).selectAll('.surface');

    surface.call(drawLabels.observe).
        call(_doubleUpHandler).
        on(_pointerPrefix + 'down.zoom', function(d3_event) {
          _lastPointerEvent = d3_event;
          if (d3_event.button === 2) {
            d3_event.stopPropagation();
          }
        }, true).
        on(_pointerPrefix + 'up.zoom', function(d3_event) {
          _lastPointerEvent = d3_event;
          if (resetTransform()) {
            immediateRedraw();
          }
        }).
        on(_pointerPrefix + 'move.map', function(d3_event) {
          _lastPointerEvent = d3_event;
        }).
        on(_pointerPrefix + 'over.vertices', function(d3_event) {
          if (map.editableDataEnabled() && !_isTransformed) {
            let hover = d3_event.target.__data__;
            surface.call(drawVertices.drawHover, context.graph(), hover,
                map.extent());
            dispatch.call('drawn', this, { full: false });
          }
        }).
        on(_pointerPrefix + 'out.vertices', function(d3_event) {
          if (map.editableDataEnabled() && !_isTransformed) {
            let hover = d3_event.relatedTarget &&
                d3_event.relatedTarget.__data__;
            surface.call(drawVertices.drawHover, context.graph(), hover,
                map.extent());
            dispatch.call('drawn', this, { full: false });
          }
        });

    const detected = utilDetect();

    // only WebKit supports gesture events
    if ('GestureEvent' in window &&
        // Listening for gesture events on iOS 13.4+ breaks double-tapping,
        // but we only need to do this on desktop Safari anyway. – #7694
        !detected.isMobileWebKit) {

      // Desktop Safari sends gesture events for multitouch trackpad pinches.
      // We can listen for these and translate them into map zooms.
      surface.on('gesturestart.surface', function(d3_event) {
        d3_event.preventDefault();
        _gestureTransformStart = projection.transform();
      }).on('gesturechange.surface', gestureChange);
    }

    // must call after surface init
    updateAreaFill();

    map.dimensions(utilGetDimensions(selection));
  }

  function pxCenter() {
    return [_dimensions[0] / 2, _dimensions[1] / 2];
  }

  function gestureChange(d3_event) {
    // Remap Safari gesture events to wheel events - #5492
    // We want these disabled most places, but enabled for zoom/unzoom on map surface
    // https://developer.mozilla.org/en-US/docs/Web/API/GestureEvent
    const e = d3_event;
    e.preventDefault();

    const props = {
      deltaMode: 0,    // dummy values to ignore in zoomPan
      deltaY: 1,       // dummy values to ignore in zoomPan
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      x: e.x,
      y: e.y,
    };

    const e2 = new WheelEvent('wheel', props);
    e2._scale = e.scale;         // preserve the original scale
    e2._rotation = e.rotation;   // preserve the original rotation

    _selection.node().dispatchEvent(e2);
  }

  map.init = function() {
    drawLayers = svgLayers(projection, context);
    drawVertices = svgVertices(projection, context);
    drawLabels = svgLabels(projection, context);
  };

  function editOff() {
    context.features().resetStats();
    surface.selectAll('.layer-osm *').remove();
    surface.selectAll('.layer-touch:not(.markers) *').remove();

    let allowed = {
      'browse': true,
      'save': true,
      'select-note': true,
      'select-data': true,
      'select-error': true,
    };

    dispatch.call('drawn', this, { full: true });
  }

  function drawEditable(difference, extent) {
    const mode = context.mode();
    const graph = context.graph();
    const features = context.features();
    const all = context.history().intersects(map.extent());
    let fullRedraw = false;
    let data;
    let set;
    let filter;
    let applyFeatureLayerFilters = true;

    if (map.isInWideSelection()) {
      data = [];
      utilEntityAndDeepMemberIDs(mode.selectedIDs(), context.graph()).
          forEach(function(id) {
            const entity = context.hasEntity(id);
            if (entity) {
              data.push(entity);
            }
          });
      fullRedraw = true;
      filter = utilFunctor(true);
      // selected features should always be visible, so we can skip filtering
      applyFeatureLayerFilters = false;
    }
    else if (difference) {
      const complete = difference.complete(map.extent());
      data = Object.values(complete).filter(Boolean);
      set = new Set(Object.keys(complete));
      filter = function(d) {
        return set.has(d.id);
      };
      features.clear(data);
    }
    else {
      // force a full redraw if gatherStats detects that a feature
      // should be auto-hidden (e.g. points or buildings)..
      if (features.gatherStats(all, graph, _dimensions)) {
        extent = undefined;
      }

      if (extent) {
        data = context.history().intersects(map.extent().intersection(extent));
        set = new Set(data.map(function(entity) {
          return entity.id;
        }));
        filter = function(d) {
          return set.has(d.id);
        };
      }
      else {
        data = all;
        fullRedraw = true;
        filter = utilFunctor(true);
      }
    }

    if (applyFeatureLayerFilters) {
      data = features.filter(data, graph);
    }
    else {
      context.features().resetStats();
    }

    if (mode && mode.id === 'select') {
      // update selected vertices - the user might have just double-clicked a way,
      // creating a new vertex, triggering a partial redraw without a mode change
      surface.call(drawVertices.drawSelected, graph, map.extent());
    }

    surface.call(drawVertices, graph, data, filter, map.extent(), fullRedraw)
        // .call(drawLines, graph, data, filter)
        // .call(drawAreas, graph, data, filter)
        // .call(drawMidpoints, graph, data, filter, map.trimmedExtent())
        .call(drawLabels, graph, data, filter, _dimensions, fullRedraw);
    // .call(drawPoints, graph, data, filter);

    dispatch.call('drawn', this, { full: true });
  }

  function zoomPan(event, key, transform) {
    let source = event && event.sourceEvent || event;
    let eventTransform = transform || (event && event.transform);
    let x = eventTransform.x;
    let y = eventTransform.y;
    let k = eventTransform.k;

    // Special handling of 'wheel' events:
    // They might be triggered by the user scrolling the mouse wheel,
    // or 2-finger pinch/zoom gestures, the transform may need adjustment.
    if (source && source.type === 'wheel') {

      // assume that the gesture is already handled by pointer events
      if (_pointerDown) return;

      let detected = utilDetect();
      let dX = source.deltaX;
      let dY = source.deltaY;
      let x2 = x;
      let y2 = y;
      let k2 = k;
      let t0, p0, p1;

      // Normalize mousewheel scroll speed (Firefox) - #3029
      // If wheel delta is provided in LINE units, recalculate it in PIXEL units
      // We are essentially redoing the calculations that occur here:
      //   https://github.com/d3/d3-zoom/blob/78563a8348aa4133b07cac92e2595c2227ca7cd7/src/zoom.js#L203
      // See this for more info:
      //   https://github.com/basilfx/normalize-wheel/blob/master/src/normalizeWheel.js
      if (source.deltaMode === 1 /* LINE */) {
        // Convert from lines to pixels, more if the user is scrolling fast.
        // (I made up the exp function to roughly match Firefox to what Chrome does)
        // These numbers should be floats, because integers are treated as pan gesture below.
        let lines = Math.abs(source.deltaY);
        let sign = (source.deltaY > 0) ? 1 : -1;
        dY = sign * clamp(
            Math.exp((lines - 1) * 0.75) * 4.000244140625,
            4.000244140625,    // min
            350.000244140625,   // max
        );

        // On Firefox Windows and Linux we always get +/- the scroll line amount (default 3)
        // There doesn't seem to be any scroll acceleration.
        // This multiplier increases the speed a little bit - #5512
        if (detected.os !== 'mac') {
          dY *= 5;
        }

        // recalculate x2,y2,k2
        t0 = _isTransformed ? _transformLast : _transformStart;
        p0 = _getMouseCoords(source);
        p1 = t0.invert(p0);
        k2 = t0.k * Math.pow(2, -dY / 500);
        k2 = clamp(k2, kMin, kMax);
        x2 = p0[0] - p1[0] * k2;
        y2 = p0[1] - p1[1] * k2;

        // 2 finger map pinch zooming (Safari) - #5492
        // These are fake `wheel` events we made from Safari `gesturechange` events..
      }
      else if (source._scale) {
        // recalculate x2,y2,k2
        t0 = _gestureTransformStart;
        p0 = _getMouseCoords(source);
        p1 = t0.invert(p0);
        k2 = t0.k * source._scale;
        k2 = clamp(k2, kMin, kMax);
        x2 = p0[0] - p1[0] * k2;
        y2 = p0[1] - p1[1] * k2;

        // 2 finger map pinch zooming (all browsers except Safari) - #5492
        // Pinch zooming via the `wheel` event will always have:
        // - `ctrlKey = true`
        // - `deltaY` is not round integer pixels (ignore `deltaX`)
      }
      else if (source.ctrlKey && !isInteger(dY)) {
        dY *= 6;   // slightly scale up whatever the browser gave us

        // recalculate x2,y2,k2
        t0 = _isTransformed ? _transformLast : _transformStart;
        p0 = _getMouseCoords(source);
        p1 = t0.invert(p0);
        k2 = t0.k * Math.pow(2, -dY / 500);
        k2 = clamp(k2, kMin, kMax);
        x2 = p0[0] - p1[0] * k2;
        y2 = p0[1] - p1[1] * k2;

        // Trackpad scroll zooming with shift or alt/option key down
      }
      else if ((source.altKey || source.shiftKey) && isInteger(dY)) {
        // recalculate x2,y2,k2
        t0 = _isTransformed ? _transformLast : _transformStart;
        p0 = _getMouseCoords(source);
        p1 = t0.invert(p0);
        k2 = t0.k * Math.pow(2, -dY / 500);
        k2 = clamp(k2, kMin, kMax);
        x2 = p0[0] - p1[0] * k2;
        y2 = p0[1] - p1[1] * k2;

        // 2 finger map panning (Mac only, all browsers except Firefox #8595) - #5492, #5512
        // Panning via the `wheel` event will always have:
        // - `ctrlKey = false`
        // - `deltaX`,`deltaY` are round integer pixels
      }
      else if (detected.os === 'mac' && detected.browser !== 'Firefox' &&
          !source.ctrlKey && isInteger(dX) && isInteger(dY)) {
        p1 = projection.translate();
        x2 = p1[0] - dX;
        y2 = p1[1] - dY;
        k2 = projection.scale();
        k2 = clamp(k2, kMin, kMax);
      }

      // something changed - replace the event transform
      if (x2 !== x || y2 !== y || k2 !== k) {
        x = x2;
        y = y2;
        k = k2;
        eventTransform = d3_zoomIdentity.translate(x2, y2).scale(k2);
        if (_zoomerPanner._transform) {
          // utilZoomPan interface
          _zoomerPanner._transform(eventTransform);
        }
        else {
          // d3_zoom interface
          _selection.node().__zoom = eventTransform;
        }
      }

    }

    if (_transformStart.x === x &&
        _transformStart.y === y &&
        _transformStart.k === k) {
      return;  // no change
    }

    if (geoScaleToZoom(k, TILESIZE) < _minZoom) {
      surface.interrupt();
      dispatch.call('hitMinZoom', this, map);
      setCenterZoom(map.center(), context.minEditableZoom(), 0, true);
      scheduleRedraw();
      dispatch.call('move', this, map);
      return;
    }

    projection.transform(eventTransform);

    let withinEditableZoom = map.withinEditableZoom();
    if (_lastWithinEditableZoom !== withinEditableZoom) {
      if (_lastWithinEditableZoom !== undefined) {
        // notify that the map zoomed in or out over the editable zoom threshold
        dispatch.call('crossEditableZoom', this, withinEditableZoom);
      }
      _lastWithinEditableZoom = withinEditableZoom;
    }

    let scale = k / _transformStart.k;
    let tX = (x / scale - _transformStart.x) * scale;
    let tY = (y / scale - _transformStart.y) * scale;

    if (context.inIntro()) {
      curtainProjection.transform({
        x: x - tX,
        y: y - tY,
        k: k,
      });
    }

    if (source) {
      _lastPointerEvent = event;
    }
    _isTransformed = true;
    _transformLast = eventTransform;
    utilSetTransform(supersurface, tX, tY, scale);
    scheduleRedraw();

    dispatch.call('move', this, map);

    function isInteger(val) {
      return typeof val === 'number' && isFinite(val) && Math.floor(val) ===
          val;
    }
  }

  function resetTransform() {
    if (!_isTransformed) return false;

    utilSetTransform(supersurface, 0, 0);
    _isTransformed = false;
    if (context.inIntro()) {
      curtainProjection.transform(projection.transform());
    }
    return true;
  }

  function redraw(difference, extent) {
    if (surface.empty() || !_redrawEnabled) return;

    // If we are in the middle of a zoom/pan, we can't do differenced redraws.
    // It would result in artifacts where differenced entities are redrawn with
    // one transform and unchanged entities with another.
    if (resetTransform()) {
      difference = extent = undefined;
    }

    const zoom = map.zoom();
    const z = String(~~zoom);

    if (surface.attr('data-zoom') !== z) {
      surface.attr('data-zoom', z);
    }

    // class surface as `lowzoom` around z17-z18.5 (based on latitude)
    const lat = map.center()[1];
    const lowzoom = d3_scaleLinear().
        domain([-60, 0, 60]).
        range([17, 18.5, 17]).
        clamp(true);

    surface.classed('low-zoom', zoom <= lowzoom(lat));

    if (!difference) {
      supersurface.call(context.background());
      wrapper.call(drawLayers);
    }

    // OSM
    if (map.editableDataEnabled() || map.isInWideSelection()) {
      context.loadTiles(projection);
      drawEditable(difference, extent);
    }
    else {
      editOff();
    }

    _transformStart = projection.transform();

    return map;
  }

  const immediateRedraw = function(difference, extent) {
    if (!difference && !extent) cancelPendingRedraw();
    redraw(difference, extent);
  };

  map.lastPointerEvent = function() {
    return _lastPointerEvent;
  };

  map.mouse = function(d3_event) {
    let event = d3_event || _lastPointerEvent;
    if (event) {
      let s;
      while ((s = event.sourceEvent)) {
        event = s;
      }
      return _getMouseCoords(event);
    }
    return null;
  };

  // returns Lng/Lat
  map.mouseCoordinates = function() {
    const coord = map.mouse() || pxCenter();
    return projection.invert(coord);
  };

  map.dblclickZoomEnable = function(val) {
    if (!arguments.length) return _dblClickZoomEnabled;
    _dblClickZoomEnabled = val;
    return map;
  };

  map.redrawEnable = function(val) {
    if (!arguments.length) return _redrawEnabled;
    _redrawEnabled = val;
    return map;
  };

  map.isTransformed = function() {
    return _isTransformed;
  };

  function setTransform(t2, duration, force) {
    const t = projection.transform();
    if (!force && t2.k === t.k && t2.x === t.x && t2.y === t.y) return false;

    if (duration) {
      _selection.transition().
          duration(duration).
          on('start', function() {
            map.startEase();
          }).
          call(_zoomerPanner.transform,
              d3_zoomIdentity.translate(t2.x, t2.y).scale(t2.k));
    }
    else {
      projection.transform(t2);
      _transformStart = t2;
      _selection.call(_zoomerPanner.transform, _transformStart);
    }

    return true;
  }

  function setCenterZoom(loc2, z2, duration, force) {
    const c = map.center();
    const z = map.zoom();
    if (loc2[0] === c[0] && loc2[1] === c[1] && z2 === z && !force) {
      return false;
    }
    const proj = geoRawMercator().transform(projection.transform()); // copy projection
    const k2 = clamp(geoZoomToScale(z2, TILESIZE), kMin, kMax);
    proj.scale(k2);

    const t = proj.translate();
    const point = proj(loc2);

    const center = pxCenter();
    t[0] += center[0] - point[0];
    t[1] += center[1] - point[1];

    return setTransform(
        d3_zoomIdentity.translate(t[0], t[1]).scale(k2, duration, force));
  }

  function zoomEventFilter(d3_event) {
    if (d3_event.type === 'mousedown') {
      let hasOrphan = false;
      let listeners = window.__on;
      for (let i = 0; i < listeners.length; i++) {
        let listener = listeners[i];
        if (listener.name === 'zoom' && listener.type === 'mouseup') {
          hasOrphan = true;
          break;
        }
      }
      if (hasOrphan) {
        let event = window.CustomEvent;
        if (event) {
          event = new event('mouseup');
        }
        else {
          event = window.document.createEvent('Event');
          event.initEvent('mouseup', false, false);
        }
        event.view = window;
        window.dispatchEvent(event);
      }
    }

    return d3_event.button !== 2;
  }

  map.pan = function(delta, duration) {
    const t = projection.translate();
    const k = projection.scale();

    t[0] += delta[0];
    t[1] += delta[1];

    if (duration) {
      _selection.transition().
          duration(duration).
          on('start', function() {
            map.startEase();
          }).
          call(_zoomerPanner.transform,
              d3_zoomIdentity.translate(t[0], t[1]).scale(k));
    }
    else {
      projection.translate(t);
      _transformStart = projection.transform();
      _selection.call(_zoomerPanner.transform, _transformStart);
      dispatch.call('move', this, map);
      immediateRedraw();
    }

    return map;
  };

  map.dimensions = function(val) {
    if (!arguments.length) return _dimensions;
    _dimensions = val;
    drawLayers.dimensions(_dimensions);
    context.background().dimensions(_dimensions);
    projection.clipExtent([[0, 0], _dimensions]);
    _getMouseCoords = utilFastMouse(supersurface.node());

    scheduleRedraw();
    return map;
  };

  function zoomIn(delta) {
    setCenterZoom(map.center(), ~~map.zoom() + delta, 250, true);
  }

  function zoomOut(delta) {
    setCenterZoom(map.center(), ~~map.zoom() - delta, 250, true);
  }

  map.zoomIn = function() {
    zoomIn(1);
  };
  map.zoomInFurther = function() {
    zoomIn(4);
  };
  map.canZoomIn = function() {
    return map.zoom() < maxZoom;
  };

  map.zoomOut = function() {
    zoomOut(1);
  };
  map.zoomOutFurther = function() {
    zoomOut(4);
  };
  map.canZoomOut = function() {
    return map.zoom() > minZoom;
  };

  map.center = function(loc2) {
    if (!arguments.length) {
      return projection.invert(pxCenter());
    }

    if (setCenterZoom(loc2, map.zoom())) {
      dispatch.call('move', this, map);
    }

    scheduleRedraw();
    return map;
  };

  map.unobscuredCenterZoomEase = function(loc, zoom) {
    let offset = map.unobscuredOffsetPx();

    let proj = geoRawMercator().transform(projection.transform());  // copy projection
    // use the target zoom to calculate the offset center
    proj.scale(geoZoomToScale(zoom, TILESIZE));

    let locPx = proj(loc);
    let offsetLocPx = [locPx[0] + offset[0], locPx[1] + offset[1]];
    let offsetLoc = proj.invert(offsetLocPx);

    map.centerZoomEase(offsetLoc, zoom);
  };

  map.unobscuredOffsetPx = function() {
    let openPane = context.container().select('.map-panes .map-pane.shown');
    if (!openPane.empty()) {
      return [openPane.node().offsetWidth / 2, 0];
    }
    return [0, 0];
  };

  map.zoom = function(z2) {
    if (!arguments.length) {
      return Math.max(geoScaleToZoom(projection.scale(), TILESIZE), 0);
    }

    if (z2 < _minZoom) {
      surface.interrupt();
      dispatch.call('hitMinZoom', this, map);
      z2 = context.minEditableZoom();
    }

    if (setCenterZoom(map.center(), z2)) {
      dispatch.call('move', this, map);
    }

    scheduleRedraw();
    return map;
  };

  map.centerZoom = function(loc2, z2) {
    if (setCenterZoom(loc2, z2)) {
      dispatch.call('move', this, map);
    }

    scheduleRedraw();
    return map;
  };

  map.zoomTo = function(entity) {
    let extent = entity.extent(context.graph());
    if (!isFinite(extent.area())) return map;

    let z2 = clamp(map.trimmedExtentZoom(extent), 0, 20);
    return map.centerZoom(extent.center(), z2);
  };

  map.centerEase = function(loc2, duration) {
    duration = duration || 250;
    setCenterZoom(loc2, map.zoom(), duration);
    return map;
  };

  map.zoomEase = function(z2, duration) {
    duration = duration || 250;
    setCenterZoom(map.center(), z2, duration, false);
    return map;
  };

  map.centerZoomEase = function(loc2, z2, duration) {
    duration = duration || 250;
    setCenterZoom(loc2, z2, duration, false);
    return map;
  };

  map.transformEase = function(t2, duration) {
    duration = duration || 250;
    setTransform(t2, duration, false /* don't force */);
    return map;
  };

  map.zoomToEase = function(obj, duration) {
    let extent;
    if (Array.isArray(obj)) {
      obj.forEach(function(entity) {
        let entityExtent = entity.extent(context.graph());
        if (!extent) {
          extent = entityExtent;
        }
        else {
          extent = extent.extend(entityExtent);
        }
      });
    }
    else {
      extent = obj.extent(context.graph());
    }
    if (!isFinite(extent.area())) return map;

    let z2 = clamp(map.trimmedExtentZoom(extent), 0, 20);
    return map.centerZoomEase(extent.center(), z2, duration);
  };

  map.startEase = function() {
    utilBindOnce(surface, _pointerPrefix + 'down.ease', function() {
      map.cancelEase();
    });
    return map;
  };

  map.cancelEase = function() {
    _selection.interrupt();
    return map;
  };

  map.extent = function(val) {
    if (!arguments.length) {
      return new geoExtent(
          projection.invert([0, _dimensions[1]]),
          projection.invert([_dimensions[0], 0]),
      );
    }
    else {
      const extent = geoExtent(val);
      map.centerZoom(extent.center(), map.extentZoom(extent));
    }
  };

  map.trimmedExtent = function(val) {
    if (!arguments.length) {
      let headerY = 71;
      let footerY = 30;
      let pad = 10;
      return new geoExtent(
          projection.invert([pad, _dimensions[1] - footerY - pad]),
          projection.invert([_dimensions[0] - pad, headerY + pad]),
      );
    }
    else {
      let extent = geoExtent(val);
      map.centerZoom(extent.center(), map.trimmedExtentZoom(extent));
    }
  };

  function calcExtentZoom(extent, dim) {
    const tl = projection([extent[0][0], extent[1][1]]);
    const br = projection([extent[1][0], extent[0][1]]);

    // Calculate maximum zoom that fits extent
    const hFactor = (br[0] - tl[0]) / dim[0];
    const vFactor = (br[1] - tl[1]) / dim[1];
    const hZoomDiff = Math.log(Math.abs(hFactor)) / Math.LN2;
    const vZoomDiff = Math.log(Math.abs(vFactor)) / Math.LN2;
    return map.zoom() - Math.max(hZoomDiff, vZoomDiff);
  }

  map.extentZoom = function(val) {
    return calcExtentZoom(geoExtent(val), _dimensions);
  };

  map.trimmedExtentZoom = function(val) {
    const trimY = 120;
    const trimX = 40;
    const trimmed = [_dimensions[0] - trimX, _dimensions[1] - trimY];
    return calcExtentZoom(geoExtent(val), trimmed);
  };

  map.withinEditableZoom = function() {
    return map.zoom() >= context.minEditableZoom();
  };

  map.isInWideSelection = function() {
    return !map.withinEditableZoom() && context.selectedIDs().length;
  };

  map.editableDataEnabled = function(skipZoomCheck) {

    const layer = context.layers().layer('osm');
    if (!layer || !layer.enabled()) return false;

    return skipZoomCheck || map.withinEditableZoom();
  };

  map.notesEditable = function() {
    const layer = context.layers().layer('notes');
    if (!layer || !layer.enabled()) return false;

    return map.withinEditableZoom();
  };

  map.minZoom = function(val) {
    if (!arguments.length) return _minZoom;
    _minZoom = val;
    return map;
  };

  map.toggleHighlightEdited = function() {
    surface.classed('highlight-edited', !surface.classed('highlight-edited'));
    map.pan([0, 0]);  // trigger a redraw
    dispatch.call('changeHighlighting', this);
  };

  map.areaFillOptions = ['wireframe', 'partial', 'full'];

  map.activeAreaFill = function(val) {
    if (!arguments.length) return prefs('area-fill') || 'partial';

    prefs('area-fill', val);
    if (val !== 'wireframe') {
      prefs('area-fill-toggle', val);
    }
    updateAreaFill();
    map.pan([0, 0]);  // trigger a redraw
    dispatch.call('changeAreaFill', this);
    return map;
  };

  map.toggleWireframe = function() {

    let activeFill = map.activeAreaFill();

    if (activeFill === 'wireframe') {
      activeFill = prefs('area-fill-toggle') || 'partial';
    }
    else {
      activeFill = 'wireframe';
    }

    map.activeAreaFill(activeFill);
  };

  function updateAreaFill() {
    const activeFill = map.activeAreaFill();
    map.areaFillOptions.forEach(function(opt) {
      surface.classed('fill-' + opt, Boolean(opt === activeFill));
    });
  }

  map.layers = () => drawLayers;

  map.doubleUpHandler = function() {
    return _doubleUpHandler;
  };

  return utilRebind(map, dispatch, 'on');

}
