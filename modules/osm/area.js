import { behaviorWay } from '../behavior/index.js';

export function osmArea(context) {
  const clipPaths = [];
  const area = {
    areaShadowGeoJSON: L.geoJSON(context.json(), {
      bubblingMouseEvents: false,
      filter: function (geoJson) {
        const is = geoJson.geometry.type === 'Polygon';
        if (is) {
          clipPaths.push(L.GeoJSON.geometryToLayer(geoJson).addTo(context.map()));
        }
        return is;
      },
      style: function (feature) {
        return { className: 'shadow' };
      },
    }),

    areaFillGeoJSON: L.geoJSON(context.json(), {
      bubblingMouseEvents: false,
      filter: function ({ geometry, properties, type }) {
        return geometry.type === 'Polygon';
      },
      style: function (feature) {
        return { className: 'area-fill' };
      },
    }).bindPopup((layer) => behaviorWay(context).bindPopup(layer))
                      .on('mouseover', ({ sourceTarget }) => behaviorWay(context).layerMouseover({
                        sourceTarget,
                        layers: area.areaShadowGeoJSON,
                      }))
                      .on('mouseout', () => behaviorWay(context).clearActiveLine())
                      .on('click', ({ sourceTarget }) => behaviorWay(context).layerHighlightClick({
                        sourceTarget,
                        layers: area.areaShadowGeoJSON,
                      })),

    areaStrokeGeoJSON: L.geoJSON(context.json(), {
      bubblingMouseEvents: false,
      filter: function ({ geometry, properties, type }) {
        return geometry.type === 'Polygon';
      },
      style: function (feature) {
        return { className: 'area-stoke' };
      },
    }),
  };

  area.addTo = function () {
    for (let key of Object.keys(area)) {
      if (key.includes('GeoJSON')) {
        area[key].addTo(context.map());
      }
    }
  };

  area.clipPath = function () {
    console.log(clipPaths);
  };

  area.clearLayers = function () {
    for (let key of Object.keys(area)) {
      if (key.includes('GeoJSON') && context.map().hasLayer(area[key])) {
        area[key].clearLayers();
        context.map().removeLayer(area[key]);
      }
    }
  };

  return area;
}
