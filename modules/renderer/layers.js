import * as d3 from 'd3';
import { osmArea, osmNode } from '../osm';
import { osmLine } from '../osm';

export function rendererLayers(context) {
  let layers = {};

  layers.initPointData = function () {
    d3.json('../../data/cd.geojson').then(json => {
      context.json = () => {return json;};
      osmArea(context).addTo();
      osmLine(context).addTo();
      const { markerClusterGroup, addTo } = osmNode(context);
      addTo();
      if (context.isFitBounds) {
        context.map().fitBounds(markerClusterGroup.getBounds());
      }
    });
  };

  return layers;
}
