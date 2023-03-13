import * as d3 from 'd3';

let activeLayer, lineMarkerFeatureGroup;
const highlightLayer = L.polyline([], { className: 'line-shadow' });

export function behaviorWay(context) {

  let behavior = {};

  behavior.layerMouseover = function ({ sourceTarget, layers }) {
    activeLayer = layers.getLayers().find(e => {
      return e.feature.properties.id === sourceTarget.feature.properties.id;
    });
    // activeLayer._path.setAttribute('class', activeLayer._path.getAttribute('class') + ' hover');
    d3.select(activeLayer._path).classed('hover', true);
  };

  behavior.layerHighlightClick = function ({ sourceTarget }) {
    behavior.clearLineMakers();
    const latLngs = sourceTarget.getLatLngs();
    const lineMarkers = [];
    for (let i = 0; i < latLngs.length; i++) {
      if (Array.isArray(latLngs[i])) {
        for (let j = 0; j < latLngs[i].length; j++) {
          const className = i === 0 && j === 0 ? 'start-lien-icon' : i === latLngs.length - 1 && j === latLngs[i].length - 1 ? 'end-lien-icon' : 'lien-icon';
          const iconSize = i === 0 && j === 0 || i === latLngs.length - 1 && j === latLngs[i].length - 1 ? [10, 10] : [8, 8];
          const divIcon = L.divIcon({ className, iconSize });
          const lineMarker = L.marker(latLngs[i][j], { icon: divIcon });
          lineMarkers.push(lineMarker);
        }
      }
      else if (typeof latLngs === 'object') {
        const className = i === 0 ? 'start-lien-icon' : i === latLngs.length - 1 ? 'end-lien-icon' : 'lien-icon';
        const iconSize = i === 0 || i === latLngs.length - 1 ? [10, 10] : [8, 8];
        const divIcon = L.divIcon({ className, iconSize });
        const lineMarker = L.marker(latLngs[i], { icon: divIcon });
        lineMarkers.push(lineMarker);
      }
    }
    if (sourceTarget.feature.geometry.type === 'Polygon') {
      latLngs[0].push(latLngs[0][0]);
    }
    lineMarkerFeatureGroup = L.featureGroup(lineMarkers).addTo(context.map());
    highlightLayer.setLatLngs(latLngs).addTo(context.map());
    // highlightLayer._path.setAttribute('class', highlightLayer._path.getAttribute('class') + ' active');
    d3.select(highlightLayer._path).classed('active', true)
  };

  behavior.clearActiveLine = function () {
    console.log('clearActiveLine: ', activeLayer);
    if (activeLayer) {
      /**
       * activeLayer._path.
       *  setAttribute('class', activeLayer._path.getAttribute('class').replace('hover', ''));
       */
      d3.select(activeLayer._path).classed('hover', false);
    }
  };

  behavior.bindPopup = function (layer) {
    let html = `<p>{</p>`;
    for (const property of Object.keys(layer.feature.properties)) {
      html += `<p><span>'${property}'</span>: ${layer.feature.properties[property]}</p>`;
    }
    html += `<p>}</p>`;
    return `<div>${html}</div>`;
  };

  behavior.clearLineMakers = function () {
    if (lineMarkerFeatureGroup) {
      lineMarkerFeatureGroup.clearLayers();
      lineMarkerFeatureGroup.remove();
    }
  };

  return behavior;

}
