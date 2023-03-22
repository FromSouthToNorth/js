// import { select as d3_select } from 'd3-selection';
// import { disableClusteringAtZoom, pointToLayer } from '../osm/node.js';
//
// let activeLayer, lineMarkerFeatureGroup, highlightLayer;
// const highlightLayerGroup = L.layerGroup(null);
//
// export function behaviorWay(context) {
//
//   let behavior = {};
//
//   behavior.layerMouseover = function ({ sourceTarget, layers }) {
//     activeLayer = layers.getLayers().find(e => {
//       return e.feature.properties.id === sourceTarget.feature.properties.id;
//     });
//     // activeLayer._path.setAttribute('class', activeLayer._path.getAttribute('class') + ' hover');
//     d3_select(activeLayer._path).classed('hover', true);
//   };
//
//   behavior.layerHighlightClick = function ({ sourceTarget, layers }) {
//     console.log(sourceTarget, layers);
//     behavior.clearLineMakers();
//     if (sourceTarget.feature.geometry.type !== 'Point') {
//       highlightLayer = layersFind(layers, sourceTarget);
//       const latLngs = highlightLayer.getLatLngs();
//       const lineMarkers = [];
//       for (let i = 0; i < latLngs.length; i++) {
//         if (Array.isArray(latLngs[i])) {
//           for (let j = 0; j < latLngs[i].length; j++) {
//             const className = i === 0 && j === 0 ? 'start-lien-icon' : i === latLngs.length - 1 && j === latLngs[i].length - 1 ? 'end-lien-icon' : 'lien-icon';
//             const iconSize = i === 0 && j === 0 || i === latLngs.length - 1 && j === latLngs[i].length - 1 ? [10, 10] : [8, 8];
//             const divIcon = L.divIcon({ className, iconSize });
//             const lineMarker = L.marker(latLngs[i][j], { icon: divIcon });
//             lineMarkers.push(lineMarker);
//           }
//         }
//         else if (typeof latLngs === 'object') {
//           const className = i === 0 ? 'start-lien-icon' : i === latLngs.length - 1 ? 'end-lien-icon' : 'lien-icon';
//           const iconSize = i === 0 || i === latLngs.length - 1 ? [10, 10] : [8, 8];
//           const divIcon = L.divIcon({ className, iconSize });
//           const lineMarker = L.marker(latLngs[i], { icon: divIcon });
//           lineMarkers.push(lineMarker);
//         }
//       }
//       if (sourceTarget.feature.geometry.type === 'Polygon') {
//         latLngs[0].push(latLngs[0][0]);
//       }
//       lineMarkerFeatureGroup = L.featureGroup(lineMarkers).addTo(context.map());
//       d3_select(highlightLayer._path).classed('active', true);
//     }
//     else {
//       const latLng = sourceTarget.getLatLng();
//       const zoom = context.map().getZoom();
//       if (zoom < disableClusteringAtZoom) {
//         context.map().setView(latLng, disableClusteringAtZoom);
//       }
//       const options = {
//         className: 'highlight-marker',
//         iconSize: [240, 240],
//         html: `<span class="water1"></span><sapn class="water2"></sapn><sapn class="water3"></sapn><sapn class="water4"></sapn>`,
//       };
//       highlightLayer = pointToLayer(sourceTarget.feature, latLng, options).setZIndexOffset(-999);
//       highlightLayerGroup.addLayer(highlightLayer).addTo(context.map());
//     }
//   };
//
//   behavior.clearActiveLine = function () {
//     if (activeLayer) {
//       /**
//        * activeLayer._path.
//        *  setAttribute('class', activeLayer._path.getAttribute('class').replace('hover', ''));
//        */
//       d3_select(activeLayer._path).classed('hover', false);
//     }
//   };
//
//   function layersFind(layers, target) {
//     const layer = layers.getLayers().find(({ feature }) => {
//       return feature.id === target.feature.id;
//     });
//     return layer;
//   }
//
//   behavior.bindPopup = function (layer) {
//     let html = `<p>{</p>`, i = 0;
//     const length = Object.keys(layer.feature.properties).length;
//     for (const property of Object.keys(layer.feature.properties)) {
//       i++;
//       html += `<p><strong>&nbsp;&nbsp;"${property}"</strong>: ${layer.feature.properties[property]}${i !== length ? ',' : ''}</p>`;
//     }
//     html += `<p>}</p>`;
//     return `<div class="json">${html}</div>`;
//   };
//
//   behavior.clearLineMakers = function () {
//     if (lineMarkerFeatureGroup) {
//       lineMarkerFeatureGroup.clearLayers();
//       lineMarkerFeatureGroup.remove();
//     }
//     if (highlightLayerGroup) {
//       highlightLayerGroup.clearLayers();
//       highlightLayerGroup.remove();
//     }
//     if (highlightLayer && highlightLayer._path) {
//       d3_select(highlightLayer._path).classed('active', false);
//     }
//     else if (highlightLayer && context.map().hasLayer(highlightLayer)) {
//       context.map().removeLayer(highlightLayer);
//     }
//   };
//
//   return behavior;
//
// }
