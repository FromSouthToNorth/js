import { osmNode } from '../osm/node.js';
import * as d3 from 'd3';

const disableClusteringAtZoom = 16

export function rendererLayers(context) {
  let layers = {
    markerCluster: L.markerClusterGroup({
      chunkedLoading: true,
      disableClusteringAtZoom,
    }).addTo(context.map()),

    markerGeoJSON: L.geoJSON(null, {
      filter: ({ geometry }) => {
        return geometry.type === 'Point';
      },
      pointToLayer: (geoJsonPoint, latlng) => osmNode().pointToLayer(geoJsonPoint, latlng, {
        className: 'my-div-icon',
        iconSize: [8, 8],
      }).bindPopup((layer) => osmNode().bindPopup(layer)),
    }).on('click', ({ layer }) => {
      const latLng = layer.getLatLng();
      context.map().setView(latLng, disableClusteringAtZoom);
      layers.highlightFeatureGroup.clearLayers();
      const options = {
        className: 'highlight-marker',
        iconSize: [240, 240],
        html: `<span class="water1"></span><sapn class="water2"></sapn><sapn class="water3"></sapn><sapn class="water4"></sapn>`,
      };
      const highlightMarker = osmNode().pointToLayer(layer.feature, latLng, options).setZIndexOffset(-60);
      layers.highlightFeatureGroup.addLayer(highlightMarker);
    }),

    highlightFeatureGroup: L.featureGroup(null).addTo(context.map()),
  };

  layers.initPointData = function () {
    d3.json('../../data/cd.geojson').then(json => {
      layers.markerGeoJSON.addData(json);
      layers.markerCluster.addLayers(layers.markerGeoJSON);
      if (context.isFitBounds) {
        context.map().fitBounds(layers.markerCluster.getBounds());
      }
    });
  };

  return layers;
}
