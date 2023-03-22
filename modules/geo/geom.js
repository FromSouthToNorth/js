import { geoVecAngle } from './vector.js';


// Return the counterclockwise angle in the range (-pi, pi)
// between the positive X axis and the line intersecting a and b.
export function geoAngle(a, b, projection) {
  return geoVecAngle(projection(a.loc), projection(b.loc));
}

// Return whether point is contained in polygon.
//
// `point` should be a 2-item array of coordinates.
// `polygon` should be an array of 2-item arrays of coordinates.
//
// From https://github.com/substack/point-in-polygon.
// ray-casting algorithm based on
// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
//
export function geoPointInPolygon(point, polygon) {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

export function geoPolygonContainsPolygon(outer, inner) {
  return inner.every(function(point) {
    return geoPointInPolygon(point, outer);
  });
}

export function geoPolygonIntersectsPolygon(outer, inner, checkSegments) {
  function testPoints(outer, inner) {
    return inner.some(function(point) {
      return geoPointInPolygon(point, outer);
    });
  }

  return testPoints(outer, inner) || (!!checkSegments && geoPathHasIntersections(outer, inner));
}
