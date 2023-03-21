/** constants */
const TAU = 2 * Math.PI;

export function geoZoomToScale(z, tileSize) {
  tileSize = tileSize || 256;
  return tileSize * Math.pow(2, z) / TAU;
}

export function geoScaleToZoom(k, tileSize) {
  tileSize = tileSize || 256;
  let log2ts = Math.log(tileSize) * Math.LOG2E;
  return Math.log(k * TAU) / Math.LN2 - log2ts;
}
