import { behaviorWay } from '../behavior/index.js';

export function osmLine(context) {
  const line = {
    lineShadowGeoJSON: L.geoJSON(context.json(), {
      bubblingMouseEvents: false,
      filter: function ({ geometry, properties, type }) {
        return geometry.type === 'LineString';
      },
      style: function (feature) {
        return { className: 'shadow' };
      },
    }),

    lineCasingGeoJSON: L.geoJSON(context.json(), {
      bubblingMouseEvents: false,
      filter: function ({ geometry, properties, type }) {
        return geometry.type === 'LineString';
      },
      style: function (feature) {
        return { className: 'line-casing' };
      },
    }),

    lineStrokeGeoJSON: L.geoJSON(context.json(), {
      bubblingMouseEvents: false,
      filter: function ({ geometry, properties, type }) {
        return geometry.type === 'LineString';
      },
      style: function (feature) {
        return { className: randomClassName() };
      },
    }),

    lineOnewayGeoJSON: L.geoJSON(context.json(), {
      bubblingMouseEvents: false,
      filter: function ({ geometry, properties, type }) {
        return geometry.type === 'LineString';
      },
      style: function (feature) {
        return { className: 'oneway' };
      },
    }),

    lineWayGeoJSON: L.geoJSON(context.json(), {
      bubblingMouseEvents: false,
      filter: function ({ geometry, properties, type }) {
        return geometry.type === 'LineString';
      },
      style: function (feature) {
        return { className: 'way' };
      },
    })
    .bindPopup((layer) => behaviorWay(context).bindPopup(layer))
    .on('mouseover', e => {
      const { sourceTarget } = e;
      behaviorWay().layerMouseover({ sourceTarget, layers: line.lineShadowGeoJSON });
    }).on('mouseout', e => {
      behaviorWay().clearActiveLine();
    }).on('click', ({ sourceTarget }) => {
      behaviorWay(context).layerHighlightClick({ sourceTarget, layers: line.lineShadowGeoJSON });
    }),
  };

  line.addTo = function () {
    for (let key of Object.keys(line)) {
      if (key.includes('GeoJSON')) {
        line[key].addTo(context.map());
      }
    }
  };

  function randomClassName() {
    const classNames = ['unclassified', 'line-stroke', 'tag-highway', 'tag-highway-motorway'];
    return classNames[Math.floor(Math.random() * classNames.length)];
  }


  return line;
}
