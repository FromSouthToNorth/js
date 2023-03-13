const minZoom = 2;
const maxZoom = 19;
const zoomSnap = 0.2;

export function rendererMap() {
  let map = {},
    _map;

  map.init = function (id) {
    _map = L.map(id, {
      minZoom,
      maxZoom,
      zoomSnap,
    }).setView([30.6598628, 104.0633717], 10);
  };

  map._map = () => {
    return _map;
  };

  return map;
}
