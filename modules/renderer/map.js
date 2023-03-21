import { zoom as d3_zoom } from 'd3-zoom';
import { select as d3_select } from 'd3-selection';
import { dispatch as d3_dispatch } from 'd3-dispatch';
import { interpolate as d3_interpolate } from 'd3-interpolate';

import { geoZoomToScale } from '../geo/index.js';
import { utilDetect, utilZoomPan } from '../util/index.js';

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
  let drawLayer;
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
    }
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
