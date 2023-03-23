import {
  geoVecAngle,
  geoVecCross,
  geoVecLength,
  geoVecSubtract,
} from './vector.js';

// Return the counterclockwise angle in the range (-pi, pi)
// between the positive X axis and the line intersecting a and b.
export function geoAngle(a, b, projection) {
  return geoVecAngle(projection(a.loc), projection(b.loc));
}

export function geoEdgeEqual(a, b) {
  return (a[0] === b[0] && a[1] === b[1]) ||
      (a[0] === b[1] && a[1] === b[0]);
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

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
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

  return testPoints(outer, inner) ||
      (!!checkSegments && geoPathHasIntersections(outer, inner));
}

// Choose the edge with the minimal distance from `point` to its orthogonal
// projection onto that edge, if such a projection exists, or the distance to
// the closest vertex on that edge. Returns an object with the `index` of the
// chosen edge, the chosen `loc` on that edge, and the `distance` to to it.
export function geoChooseEdge(nodes, point, projection, activeID) {
  let dist = geoVecLength;
  let points = nodes.map(function(n) {
    return projection(n.loc);
  });
  let ids = nodes.map(function(n) {
    return n.id;
  });
  let min = Infinity;
  let idx;
  let loc;

  for (let i = 0; i < points.length - 1; i++) {
    if (ids[i] === activeID || ids[i + 1] === activeID) continue;

    let o = points[i];
    let s = geoVecSubtract(points[i + 1], o);
    let v = geoVecSubtract(point, o);
    let proj = geoVecDot(v, s) / geoVecDot(s, s);
    let p;

    if (proj < 0) {
      p = o;
    }
    else if (proj > 1) {
      p = points[i + 1];
    }
    else {
      p = [o[0] + proj * s[0], o[1] + proj * s[1]];
    }

    let d = dist(p, point);
    if (d < min) {
      min = d;
      idx = i + 1;
      loc = projection.invert(p);
    }
  }

  if (idx !== undefined) {
    return { index: idx, distance: min, loc: loc };
  }
  else {
    return null;
  }
}

export function geoPathIntersections(path1, path2) {
  let intersections = [];
  for (let i = 0; i < path1.length - 1; i++) {
    for (let j = 0; j < path2.length - 1; j++) {
      let a = [path1[i], path1[i + 1]];
      let b = [path2[j], path2[j + 1]];
      let hit = geoLineIntersection(a, b);
      if (hit) {
        intersections.push(hit);
      }
    }
  }
  return intersections;
}

// Return the intersection point of 2 line segments.
// From https://github.com/pgkelley4/line-segments-intersect
// This uses the vector cross product approach described below:
//  http://stackoverflow.com/a/565282/786339
export function geoLineIntersection(a, b) {
  let p = [a[0][0], a[0][1]];
  let p2 = [a[1][0], a[1][1]];
  let q = [b[0][0], b[0][1]];
  let q2 = [b[1][0], b[1][1]];
  let r = geoVecSubtract(p2, p);
  let s = geoVecSubtract(q2, q);
  let uNumerator = geoVecCross(geoVecSubtract(q, p), r);
  let denominator = geoVecCross(r, s);

  if (uNumerator && denominator) {
    let u = uNumerator / denominator;
    let t = geoVecCross(geoVecSubtract(q, p), s) / denominator;

    if ((t >= 0) && (t <= 1) && (u >= 0) && (u <= 1)) {
      return geoVecInterp(p, p2, t);
    }
  }

  return null;
}

export function geoPathLength(path) {
  let length = 0;
  for (let i = 0; i < path.length - 1; i++) {
    length += geoVecLength(path[i], path[i + 1]);
  }
  return length;
}

// If the given point is at the edge of the padded viewport,
// return a vector that will nudge the viewport in that direction
export function geoViewportEdge(point, dimensions) {
  let pad = [80, 20, 50, 20];   // top, right, bottom, left
  let x = 0;
  let y = 0;

  if (point[0] > dimensions[0] - pad[1]) {
    x = -10;
  }
  if (point[0] < pad[3]) {
    x = 10;
  }
  if (point[1] > dimensions[1] - pad[2]) {
    y = -10;
  }
  if (point[1] < pad[0]) {
    y = 10;
  }

  if (x || y) {
    return [x, y];
  }
  else {
    return null;
  }
}
