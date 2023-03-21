import { select as d3_select } from 'd3-selection';
import { dispatch as d3_dispatch } from 'd3-dispatch';
import { utilRebind, utilStringQs } from '../util/index.js';
import packageJSON from '../../package.json';
import { geoRawMercator } from '../geo/index.js';
import { rendererMap } from '../renderer/index.js';

export function coreContext() {
  const dispatch = d3_dispatch('enter', 'exit', 'change');
  let context = utilRebind({}, dispatch, 'on');
  context.version = packageJSON.version;
  context.privacyVersion = '2023年3月16日14:36:47';

  // will alter the hash so cache the parameters intended to setup the session
  context.initialHashParams = window.location.hash ? utilStringQs(window.location.hash) : {};

  /* Container */
  let _container = d3_select(null);
  context.container = function (val) {
    if (!arguments.length) return _container;
    _container = val;
    _container.classed('ideditor', true);
    return context;
  };
  context.containerNode = function (val) {
    if (!arguments.length) return context.container().node();
    context.container(d3_select(val));
    return context;
  };

  /* Projections */
  context.projection = geoRawMercator();
  context.curtainProjection = geoRawMercator();

  /** Map */
  let _map;
  context.map = () => _map;
  context.layers = () => _map.layers();
  context.surface = () => _map.surface;

  context.init = () => {
    instantiateInternal();
    return context;

    function instantiateInternal() {
      _map = rendererMap(context);
    }
  };

  return context;
}
