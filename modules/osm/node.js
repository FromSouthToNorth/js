import { behaviorWay } from '../behavior/index.js';

export const disableClusteringAtZoom = 16;

export function osmNode(context) {
  const node = {
    markerClusterGroup: L.markerClusterGroup({
      chunkedLoading: true, disableClusteringAtZoom,
    }),

    markerGeoJSON: L.geoJSON(context.json(), {
      filter: ({ geometry }) => {
        return geometry.type === 'Point';
      },
      pointToLayer: (geoJsonPoint, latlng) => pointToLayer(geoJsonPoint, latlng, {
        className: 'my-div-icon', iconSize: [8, 8],
      }).bindPopup((layer) => behaviorWay(context).bindPopup(layer)),
    })
    .on('click', (e) => {
      behaviorWay(context).layerHighlightClick(e);
    }),

  };

  node.addTo = function () {
    node.markerClusterGroup.addLayers(node.markerGeoJSON);
    for (let key of Object.keys(node)) {
      if (key.includes('Group')) {
        node[key].addTo(context.map());
      }
    }
  };

  node.clearLayers = function () {
    for (let key of Object.keys(node)) {
      if (key.includes('Group') && context.map().hasLayer(node[key])) {
        node[key].clearLayers();
        context.map().removeLayer(node[key]);
      }
    }
  };

  return node;
}

export function pointToLayer(geoJsonPoint, latlng, options) {
  const icon = L.divIcon(options);
  const marker = L.marker(latlng, { icon });
  return marker;
}
