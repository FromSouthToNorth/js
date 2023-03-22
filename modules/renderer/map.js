import _throttle from 'lodash-es/throttle';

import { zoom as d3_zoom } from 'd3-zoom';
import { select as d3_select } from 'd3-selection';
import { dispatch as d3_dispatch } from 'd3-dispatch';
import { interpolate as d3_interpolate } from 'd3-interpolate';
import { zoomIdentity as d3_zoomIdentity } from 'd3-zoom';

import {
  utilBindOnce,
  utilDetect, utilDoubleUp,
  utilFastMouse,
  utilGetDimensions,
  utilRebind,
  utilSetTransform,
  utilZoomPan,
} from '../util/index.js';

import { geoRawMercator, geoScaleToZoom, geoZoomToScale } from '../geo/index.js';

import { prefs } from '../core/index.js';

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
  const dispatch = d3_dispatch('move', 'drawn', 'crossEditableZoom', 'hitMinZoom', 'changeHighlighting', 'changeAreaFill');
  const projection = context.projection;
  const curtainProjection = context.curtainProjection;
  let drawLayers;
  let drawPoints;
  let drawVertices;
  let drawLines;
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

  let _zoomerPannerFunction = 'PointerEvent' in window ? utilZoomPan : d3_zoom;

  let _zoomerPanner = _zoomerPannerFunction()
  .scaleExtent([kMin, kMax])
  .interpolate(d3_interpolate)
  .filter(zoomEventFilter)
  .on('zoom.map', zoomPan)
  .on('start.map', function (d3_event) {
    _pointerDown = d3_event && (d3_event.type === 'pointerdown' ||
      (d3_event.sourceEvent && d3_event.sourceEvent.type === 'pointerdown'));
  })
  .on('end.map', function () {
    _pointerDown = false;
  });

  const _doubleUpHandler = utilDoubleUp();

  const scheduleRedraw = _throttle(redraw, 750);

  function map(selection) {
    _selection = selection;
    context.on('change.map', immediateRedraw);
    map.dimensions(utilGetDimensions(selection));
  }

  function pxCenter() {
    return [_dimensions[0] / 2, _dimensions[1] / 2];
  }

  function zoomPan(event, key, transform) {
    let source = event && event.sourceEvent || event;
    let eventTransform = transform || (event && event.transform);
    let x = eventTransform.x,
      y = eventTransform.y,
      k = eventTransform.k;

    // ‘wheel’事件的特殊处理：
    // 它们可能由用户滚动鼠标滚轮触发，
    // 或 2 指捏/缩放手势，变换可能需要调整。
    if (source && source.type === 'wheel') {
      if (_pointerDown) return;

      let detected = utilDetect();
      let dX = source.deltaX,
        dY = source.deltaY,
        x2 = x,
        y2 = y,
        k2 = k,
        t0, p0, p1;

      // Normalize mousewheel scroll speed (Firefox) - #3029
      // If wheel delta is provided in LINE units, recalculate it in PIXEL units
      // We are essentially redoing the calculations that occur here:
      //   https://github.com/d3/d3-zoom/blob/78563a8348aa4133b07cac92e2595c2227ca7cd7/src/zoom.js#L203
      // See this for more info:
      //   https://github.com/basilfx/normalize-wheel/blob/master/src/normalizeWheel.js
      if (source.deltaMode === 1 /* LINE */) {
        let lines = Math.abs(source.deltaY),
          sign = (source.deltaY > 0) ? 1 : -1,
          dY = sign * clamp(
            Math.exp((lines - 1) * 0.75) * 4.000_244_140_625,
            4.000_244_140_625,    // min
            350.000_244_140_625,  // max
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
      }
        // 2 finger map pinch zooming (Safari) - #5492
      // These are fake `wheel` events we made from Safari `gesturechange` events..
      else if (source._scale) {
        // recalculate x2,y2,k2
        t0 = _gestureTransformStart;
        p0 = _getMouseCoords(source);
        p1 = t0.invert(p0);
        k2 = t0.k * source._scale;
        k2 = clamp(k2, kMin, kMax);
        x2 = p0[0] - p1[0] * k2;
        y2 = p0[1] - p1[1] * k2;
      }
        // 2 finger map pinch zooming (all browsers except Safari) - #5492
        // Pinch zooming via the `wheel` event will always have:
        // - `ctrlKey = true`
      // - `deltaY` is not round integer pixels (ignore `deltaX`)
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
      }
      // Trackpad scroll zooming with shift or alt/option key down
      else if ((source.altKey || source.shiftKey) && isInteger(dY)) {
        // recalculate x2,y2,k2
        t0 = _isTransformed ? _transformLast : _transformStart;
        p0 = _getMouseCoords(source);
        p1 = t0.invert(p0);
        k2 = t0.k * Math.pow(2, -dY / 500);
        k2 = clamp(k2, kMin, kMax);
        x2 = p0[0] - p1[0] * k2;
        y2 = p0[1] - p1[1] * k2;
      }
        // 2 finger map panning (Mac only, all browsers except Firefox #8595) - #5492, #5512
        // Panning via the `wheel` event will always have:
        // - `ctrlKey = false`
      // - `deltaX`,`deltaY` are round integer pixels
      else if (detected.os === 'mac' && detected.browser !== 'Firefox' && !source.ctrlKey && isInteger(dX) && isInteger(dY)) {
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

    const withinEditableZoom = map.withinEditableZoom();
    if (_lastWithinEditableZoom !== withinEditableZoom) {
      if (_lastWithinEditableZoom !== undefined) {
        // notify that the map zoomed in or out over the editable zoom threshold
        dispatch.call('crossEditableZoom', this, withinEditableZoom);
      }
      _lastWithinEditableZoom = withinEditableZoom;
    }

    const scale = k / _transformStart.k;
    const tX = (x / scale - _transformStart.x) * scale;
    const tY = (y / scale - _transformStart.y) * scale;

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
      return typeof val === 'number' && isFinite(val) && Math.floor(val) === val;
    }
  }

  function redraw(difference, extent) {
    if (surface.empty() || !_redrawEnabled) return;

    // If we are in the middle of a zoom/pan, we can't do differenced redraws.
    // It would result in artifacts where differenced entities are redrawn with
    // one transform and unchanged entities with another.
    if (resetTransform()) {
      difference = extent = undefined;
    }

    var zoom = map.zoom();
    var z = String(~~zoom);

    if (surface.attr('data-zoom') !== z) {
      surface.attr('data-zoom', z);
    }

    // class surface as `lowzoom` around z17-z18.5 (based on latitude)
    var lat = map.center()[1];
    var lowzoom = d3_scaleLinear()
    .domain([-60, 0, 60])
    .range([17, 18.5, 17])
    .clamp(true);

    surface
    .classed('low-zoom', zoom <= lowzoom(lat));


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

  const immediateRedraw = function (difference, extent) {
    if (!difference && !extent) cancelPendingRedraw();
    redraw(difference, extent);
  };

  map.lastPointerEvent = function () {
    return _lastPointerEvent;
  };

  map.mouse = function (d3_event) {
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
  map.mouseCoordinates = function () {
    const coord = map.mouse() || pxCenter();
    return projection.invert(coord);
  };


  map.dblclickZoomEnable = function (val) {
    if (!arguments.length) return _dblClickZoomEnabled;
    _dblClickZoomEnabled = val;
    return map;
  };


  map.redrawEnable = function (val) {
    if (!arguments.length) return _redrawEnabled;
    _redrawEnabled = val;
    return map;
  };


  map.isTransformed = function () {
    return _isTransformed;
  };


  function setTransform(t2, duration, force) {
    const t = projection.transform();
    if (!force && t2.k === t.k && t2.x === t.x && t2.y === t.y) return false;

    if (duration) {
      _selection
      .transition()
      .duration(duration)
      .on('start', function () { map.startEase(); })
      .call(_zoomerPanner.transform, d3_zoomIdentity.translate(t2.x, t2.y).scale(t2.k));
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

    return setTransform(d3_zoomIdentity.translate(t[0], t[1].scale(k2), duration, force));
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

  function cancelPendingRedraw() {
    scheduleRedraw.cancel();
    // isRedrawScheduled = false;
    // window.cancelIdleCallback(pendingRedrawCall);
  }


  map.dimensions = function (val) {
    if (!arguments.length) return _dimensions;
    _dimensions = val;
    drawLayers.dimensions(_dimensions);
    context.background().dimensions(_dimensions);
    projection.clipExtent([[0, 0], _dimensions]);
    _getMouseCoords = utilFastMouse(supersurface.node());

    // scheduleRedraw();
    return map;
  };

  map.startEase = function () {
    utilBindOnce(surface, _pointerPrefix + 'down.ease', function () {
      map.cancelEase();
    });
    return map;
  };

  map.cancelEase = function () {
    _selection.interrupt();
    return map;
  };


  map.extentZoom = function (val) {
    return calcExtentZoom(geoExtent(val), _dimensions);
  };


  map.trimmedExtentZoom = function (val) {
    var trimY = 120;
    var trimX = 40;
    var trimmed = [_dimensions[0] - trimX, _dimensions[1] - trimY];
    return calcExtentZoom(geoExtent(val), trimmed);
  };


  map.withinEditableZoom = function () {
    return map.zoom() >= context.minEditableZoom();
  };


  map.isInWideSelection = function () {
    return !map.withinEditableZoom() && context.selectedIDs().length;
  };


  map.editableDataEnabled = function (skipZoomCheck) {

    var layer = context.layers().layer('osm');
    if (!layer || !layer.enabled()) return false;

    return skipZoomCheck || map.withinEditableZoom();
  };


  map.notesEditable = function () {
    var layer = context.layers().layer('notes');
    if (!layer || !layer.enabled()) return false;

    return map.withinEditableZoom();
  };


  map._minZoom = function (val) {
    if (!arguments.length) return _minzoom;
    _minZoom = val;
    return map;
  };


  map.toggleHighlightEdited = function () {
    surface.classed('highlight-edited', !surface.classed('highlight-edited'));
    map.pan([0, 0]);  // trigger a redraw
    dispatch.call('changeHighlighting', this);
  };


  map.areaFillOptions = ['wireframe', 'partial', 'full'];

  map.activeAreaFill = function (val) {
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

  map.toggleWireframe = function () {

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
    map.areaFillOptions.forEach(function (opt) {
      surface.classed('fill-' + opt, Boolean(opt === activeFill));
    });
  }


  map.layers = () => drawLayers;


  map.doubleUpHandler = function () {
    return _doubleUpHandler;
  };


  return utilRebind(map, dispatch, 'on');


  // let map = {},
  //   _map;
  //
  // map.init = function (id) {
  //   _map = L.map(id, {
  //     minZoom,
  //     maxZoom,
  //     zoomSnap,
  //   }).setView([30.6598628, 104.0633717], 16);
  //
  //   _map.addControl(L.control.scale());
  // };
  //
  // map._map = () => {
  //   return _map;
  // };
  //
  // return map;
}
