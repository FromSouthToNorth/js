import * as d3 from 'd3';
import { utilRebind, utilStringQs } from '../util/index.js';
import packageJSON from '../../package.json';
import { geoRawMercator } from '../geo/raw_mercator.js';

export function coreContext() {
  const dispatch = d3.dispatch('enter', 'exit', 'change');
  let context = utilRebind({}, dispatch, 'on');
  context.version = packageJSON.version;
  context.privacyVersion = '2023年3月16日14:36:47';

  // will alter the hash so cache the parameters intended to setup the session
  context.initialHashParams = window.location.hash ? utilStringQs(window.location.hash) : {};

  /* Container */
  let _container = d3.select(null);
  context.container = function (val) {
    if (!arguments.length) return _container;
    _container = val;
    _container.classed('ideditor', true);
    return context;
  };
  context.containerNode = function (val) {
    if (!arguments.length) return context.container().node();
    context.container(d3.select(val));
    return context;
  };

  /* Projections */
  context.projection = geoRawMercator();
  context.curtainProjection = geoRawMercator();

  return context;
}
