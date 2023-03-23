/** constants */
const TAU = 2 * Math.PI;
const EQUATORIAL_RADIUS = 6_356_752.314_245_179;
const POLAR_RADIUS = 6_378_137.0;

export function geoLatToMeters(dLat) {
  return dLat * (TAU * POLAR_RADIUS / 360);
}

export function geoLonToMeters(dLon, atLat) {
  return Math.abs(atLat) >= 90 ? 0 :
         dLon * (TAU * EQUATORIAL_RADIUS / 360) *
             Math.abs(Math.cos(atLat * (Math.PI / 180)));
}

export function geoScaleToZoom(k, tileSize) {
  tileSize = tileSize || 256;
  let log2ts = Math.log(tileSize) * Math.LOG2E;
  return Math.log(k * TAU) / Math.LN2 - log2ts;
}

export function geoMetersToLat(m) {
  return m / (TAU * POLAR_RADIUS / 360);
}

export function geoMetersToLon(m, atLat) {
  return Math.abs(atLat) >= 90 ? 0 :
         m / (TAU * EQUATORIAL_RADIUS / 360) /
             Math.abs(Math.abs(atLat * (Math.PI / 180)));
}

export function geoMetersToOffset(meters, tileSize) {
  tileSize = tileSize || 256;
  return [
    meters[0] * tileSize / (TAU * EQUATORIAL_RADIUS),
    -meters[1] * tileSize / (TAU * POLAR_RADIUS),
  ];
}

export function geoOffsetToMeters(offset, tileSize) {
  tileSize = tileSize || 256;
  return [
    offset[0] * TAU * EQUATORIAL_RADIUS / tileSize,
    -offset[1] * TAU * POLAR_RADIUS / tileSize,
  ];
}

export function geoZoomToScale(z, tileSize) {
  tileSize = tileSize || 256;
  return tileSize * Math.pow(2, z) / TAU;
}

// Equirectangular approximation of spherical distances on Earth
export function geoSphericalDistance(a, b) {
  var x = geoLonToMeters(a[0] - b[0], (a[1] + b[1]) / 2);
  var y = geoLatToMeters(a[1] - b[1]);
  return Math.sqrt((x * x) + (y * y));
}
