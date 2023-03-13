export function osmNode(context) {
  const node = {};
  node.pointToLayer = function (geoJsonPoint, latlng, options) {
    const icon = L.divIcon(options);
    const marker = L.marker(latlng, { icon });
    return marker;
  };

  node.bindPopup = function (layer) {
    let html = `<p>{</p>`;
    for (const property of Object.keys(layer.feature.properties)) {
      html += `<p><span>'${property}'</span>: ${layer.feature.properties[property]}</p>`;
    }
    html += `<p>}</p>`;
    return `<div>${html}</div>`;
  }
  return node;
}
