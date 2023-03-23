import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';
import {
  utilArrayDifference,
  utilGetDimensions,
  utilRebind,
} from '../util/index.js';
import { svgOsm } from './osm.js';

export function svgLayers(projection, context) {
  const dispatch = d3_dispatch('change');
  let svg = d3_select(null);
  let _layers = [
    { id: 'osm', layer: svgOsm(projection, context, dispatch) },
  ];

  function drawLayers(selection) {
    svg = selection.selectAll('.surface').data([0]);
    svg = svg.enter().append('svg').attr('class', 'surface').merge(svg);
    const defs = svg.selectAll('.surface-defs').data([0]);
    defs.enter().append('defs').attr('class', 'surface-defs');
    const groups = svg.selectAll('.data-layer').data(_layers);
    groups.exit().remove();
    groups.enter().append('g').attr('class', function(d) {
      return 'data-layer ' + d.id;
    }).merge(groups).each(function(d) {
      d3_select(this).call(d.layer);
    });
  }

  drawLayers.all = function() {
    return _layers;
  };

  drawLayers.layer = function(id) {
    const obj = _layers.find(o => {
      return o.id === id;
    });
    return obj && obj.layer;
  };

  drawLayers.only = function(what) {
    const arr = [].concat(what);
    const all = _layers.map(layer => {
      return layer.id;
    });
    return drawLayers.remove(utilArrayDifference(all, arr));
  };

  drawLayers.remove = function(what) {
    const arr = [].concat(what);
    arr.forEach(id => {
      _layers = _layers.filter(o => {
        return o.id !== id;
      });
    });
    dispatch.call('change');
    return this;
  };

  drawLayers.add = function(what) {
    const arr = [].concat(what);
    arr.forEach(obj => {
      if ('id' in obj && 'layer' in obj) {
        _layers.push(obj);
      }
    });
    dispatch.call('change');
    return this;
  };

  drawLayers.dimensions = function(val) {
    if (!arguments.length) return utilGetDimensions(svg);
    utilGetDimensions(svg, val);
    return this;
  };

  return utilRebind(drawLayers, dispatch, 'on');

}
