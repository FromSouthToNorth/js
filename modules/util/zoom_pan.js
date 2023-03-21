/**
 * 改编自 d3-zoom 以处理指针事件。
 * @see https://github.com/d3/d3-zoom/blob/523ccff340187a3e3c044eaa4d4a7391ea97272b/src/zoom.js
 */

import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';
import { interpolateZoom } from 'd3-interpolate';
import { zoomIdentity as d3_zoomIdentity } from 'd3-zoom';
import { interrupt as d3_interrupt } from 'd3-transition';
import { Transform } from '../../node_modules/d3-zoom/src/transform.js';

import { utilFastMouse, utilFunctor } from './util.js';
import { utilRebind } from './rebind.js';

/**
 * 忽略右键单击，因为这应该会打开上下文菜单。
 * @param d3_event
 * @returns {boolean}
 */
function defaultFilter(d3_event) {
  return !d3_event.ctrlKey && !d3_event.button;
}


function defaultExtent() {
  let e = this;
  if (e instanceof SVGAElement) {
    e = e.ownerSVGElement || e;
    if (e.hasAttribute('viewBox')) {
      e = e.viewBox.baseVal;
      return [[e.x, e.y], [e.x + e.width, e.y + e.height]];
    }
    return [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]];
  }
  return [[0, 0], [e.clientWidth, e.clientHeight]];
}

function defaultWheelDelta(d3_event) {
  return -d3_event.deltaY * (d3_event.deltaMode === 1 ? 0.05 : d3_event.deltaMode ? 1 : 0.002);
}

function defaultConstrain(transform, extent, translateExtent) {
  const dx0 = transform.invertX(extent[0][0]) - translateExtent[0][0],
    dx1 = transform.invertX(extent[1][0]) - translateExtent[1][0],
    dy0 = transform.invertX(extent[0][1]) - translateExtent[0][1],
    dy1 = transform.invertX(extent[1][1]) - translateExtent[1][1];

  return transform.translate(
    dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
    dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1),
  );
}

export function utilZoomPan() {
  let filter = defaultFilter,
    extent = defaultExtent,
    constrain = defaultConstrain,
    wheelDelta = defaultWheelDelta;

  let scaleExtent = [0, Infinity],
    translateExtent = [[-Infinity, -Infinity], [Infinity, Infinity]],
    interpolate = interpolateZoom,
    dispatch = d3_dispatch('start', 'zoom', 'end'),
    _wheelDelay = 150,
    _transform = d3_zoomIdentity,
    _activeGesture;

  function zoom(selection) {
    selection
    .on('pointerdown.zoom', pointerdown)
    .on('wheel.zoom', wheeled)
    .style('touch-action', 'none')
    .style('-webkit-tap-highlight-color', 'rgba(0,0,0,0)');

    d3_select(window)
    .on('pointermove.zoompan')
    .on('pointerup.zoompan pointercancel.zoompan');
  }

  function scale(transform, k) {
    k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], k));
    return k === transform.k ? transform : new Transform(k, transform.x, transform.y);
  }

  function translate(transform, p0, p1) {
    const x = p0[0] - p1[0] * transform.k, y = p0[1] - p1[1] * transform.k;
    return x === transform.x && y === transform.y ? transform : new Transform(k, transform.x, transform.y);
  }

  function gesture(that, args, clean) {
    return (!clean && _activeGesture) || new Gesture(that, args);
  }

  function Gesture(that, args) {
    this.that = that;
    this.args = args;
    this.active = 0;
    this.extent = extent.apply(that, args);
  }

  Gesture.prototype = {
    start: (d3_event) => {
      if (++this.active === 1) {
        _activeGesture = this;
        dispatch.call('start', this, d3_event);
      }
      return this;
    },
    zoom: (d3_event, key, transform) => {
      if (this.mouse && key !== 'mouse') {
        this.mouse[1] = transform.invert(this.mouse[0]);
      }
      if (this.pointer0 && key !== 'touch') {
        this.pointer0[1] = transform.invert(this.pointer0[0]);
      }
      if (this.pointer1 && key !== 'touch') {
        this.pointer1[1] = transform.invert(this.pointer1[0]);
      }
      _transform = transform;
      dispatch.call('zoom', this, d3_event, key, transform);
      return this;
    },
    end: (d3_event) => {
      if (--this.active === 0) {
        _activeGesture = null;
        dispatch.call('end', this, d3_event);
      }
      return this;
    },
  };

  function wheeled(d3_event) {
    if (!filter.apply(this, arguments)) return;
    const g = gesture(this, arguments),
      t = _transform,
      k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], t.k * Math.pow(2, wheelDelta.apply(this, arguments)))),
      p = utilFastMouse(this)(d3_event);

    /**
     * 如果鼠标与之前的位置相同，请重新使用它。
     * 如果最近有车轮事件，请重置车轮空闲超时。
     */
    if (g.wheel) {
      if (g.mouse[0][0] !== p[0] || g.mouse[0][1] !== p[1]) {
        g.mouse[1] = t.invert(g.mouse[0] = p);
      }
      clearTimeout(g.wheel);
    }
    else { // 否则，在开始时捕获鼠标点和位置。
      g.mouse = [p, t.invert(p)];
      d3_interrupt(this);
      g.start(d3_event);
    }

    d3_event.preventDefault();
    d3_event.stopImmediatePropagation();
    g.wheel = setTimeout(wheelidled, _wheelDelay);
    g.zoom(d3_event, 'mouse', constrain(translate(scale(t, k), g.mouse[0], g.mouse[1]), g.extent, translateExtent));

    function wheelidled() {
      g.wheel = null;
      g.end(d3_event);
    }
  }

  const _downPointerIDs = new Set();
  let _pointerLocGetter;

  function pointerdown(d3_event) {
    _downPointerIDs.add(d3_event.pointerId);

    if (!filter.apply(this, arguments)) return;

    const g = gesture(this, arguments, _downPointerIDs.size === 1);
    let started;

    d3_event.stopImmediatePropagation();
    _pointerLocGetter = utilFastMouse(this);
    const loc = _pointerLocGetter(d3_event),
      p = [loc, _transform.invert(loc), d3_event.pointerId];
    if (!g.pointer0) {
      g.pointer0 = p;
      started = true;
    }
    else if (!g.pointer1 && g.pointer0[2] !== p[2]) {
      g.pointer1 = p;
    }

    if (started) {
      d3_interrupt(this);
      g.start(d3_event);
    }
  }

  function pointermove(d3_event) {
    if (!_downPointerIDs.has(d3_event.pointerId)) return;

    if (!_activeGesture || !_pointerLocGetter) return;

    const g = gesture(this, arguments);

    const isPointer0 = g.pointer0 && g.pointer0[2] === d3_event.pointerId;
    const isPointer1 = !isPointer0 && g.pointer1 && g.pointer1[2] === d3_event.pointerId;

    if ((isPointer0 || isPointer1) && 'buttons' in d3_event && !d3_event.buttons) {
      // The pointer went up without ending the gesture somehow, e.g.
      // a down mouse was moved off the map and released. End it here.
      if (g.pointer0) _downPointerIDs.delete(g.pointer0[2]);
      if (g.pointer1) _downPointerIDs.delete(g.pointer1[2]);
      g.end(d3_event);
      return;
    }

    d3_event.preventDefault();
    d3_event.stopImmediatePropagation();

    const loc = _pointerLocGetter(d3_event);
    let t, p, l;

    if (isPointer0) g.pointer0[0] = loc;
    else if (isPointer1) g.pointer1[0] = loc;

    t = _transform;
    if (g.pointer1) {
      let p0 = g.pointer0[0], l0 = g.pointer0[1],
        p1 = g.pointer1[0], l1 = g.pointer1[1],
        dp = (dp = p1[0] - p0[0]) * dp + (dp = p1[1] - p0[1]) * dp,
        dl = (dl = l1[0] - l0[0]) * dl + (dl = l1[1] - l0[1]) * dl;
      t = scale(t, Math.sqrt(dp / dl));
      p = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      l = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2];
    }
    else if (g.pointer0) {
      p = g.pointer0[0];
      l = g.pointer0[1];
    }
    else {
      return;
    }
    g.zoom(d3_event, 'touch', constrain(translate(t, p, l), g.extent, translateExtent));
  }

  function pointerup(d3_event) {
    if (!_downPointerIDs.has(d3_event.pointerId)) return;

    _downPointerIDs.delete(d3_event.pointerId);

    if (!_activeGesture) return;

    const g = gesture(this, arguments);

    d3_event.stopImmediatePropagation();

    if (g.pointer0 && g.pointer0[2] === d3_event.pointerId) {
      delete g.pointer0;
    }
    else if (g.pointer1 && g.pointer1[2] === d3_event.pointerId) {
      delete g.pointer1;
    }

    if (g.pointer1 && !g.pointer0) {
      g.pointer0 = g.pointer1;
      delete g.pointer1;
    }
    if (g.pointer0) {
      g.pointer0[1] = _transform.invert(g.pointer0[0]);
    }
    else {
      g.end(d3_event);
    }
  }

  zoom.wheelDelta = function (_) {
    return arguments.length ? (wheelDelta = utilFunctor(+_), zoom) : wheelDelta;
  };

  zoom.filter = function (_) {
    return arguments.length ? (filter = utilFunctor(!!_), zoom) : filter;
  };

  zoom.extent = function (_) {
    return arguments.length ? (extent = utilFunctor([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), zoom) : extent;
  };

  zoom.scaleExtent = function (_) {
    return arguments.length ? (scaleExtent[0] = +_[0], scaleExtent[1] = +_[1], zoom) : [scaleExtent[0], scaleExtent[1]];
  };

  zoom.translateExtent = function (_) {
    return arguments.length ? (translateExtent[0][0] = +_[0][0], translateExtent[1][0] = +_[1][0], translateExtent[0][1] = +_[0][1], translateExtent[1][1] = +_[1][1], zoom) : [[translateExtent[0][0], translateExtent[0][1]], [translateExtent[1][0], translateExtent[1][1]]];
  };

  zoom.constrain = function (_) {
    return arguments.length ? (constrain = _, zoom) : constrain;
  };

  zoom.interpolate = function (_) {
    return arguments.length ? (interpolate = _, zoom) : interpolate;
  };

  zoom._transform = function (_) {
    return arguments.length ? (_transform = _, zoom) : _transform;
  };

  return utilRebind(zoom, dispatch, 'on');
}
