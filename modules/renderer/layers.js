import {json as d3_json} from 'd3-fetch';
import { osmArea, osmNode, osmLine } from '../osm';

export function rendererLayers(context) {
  let layers = {
    json: undefined,
  };

  layers.initPointData = function () {
    if (layers.json) {
      return;
    }
    d3_json('../../data/lingshui.json').then(json => {
      layers.json = json;
      context.json = () => {return json;};
      osmArea(context).addTo();
      osmLine(context).addTo();
      const { markerClusterGroup, addTo } = osmNode(context);
      addTo();
      osmNode(context).addTo();
      context.map().fitBounds(markerClusterGroup.getBounds());
    });
  };
  layers.clearLayers = function () {
    osmArea(context).clearLayers();
    osmNode(context).clearLayers();
    osmLine(context).clearLayers();
  };

  return layers;
}
