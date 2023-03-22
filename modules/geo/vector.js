// vector addition
export function geoVecAdd(a, b) {
  return [ a[0] + b[0], a[1] + b[1] ];
}

// vector subtraction
export function geoVecSubtract(a, b) {
  return [ a[0] - b[0], a[1] - b[1] ];
}

export function geoVecLength(a, b) {
  return Math.sqrt(geoVecLengthSquare(a, b));
}

// length of vector raised to the power two
export function geoVecLengthSquare(a, b) {
  b = b || [0, 0];
  const x = a[0] - b[0];
  const y = a[1] - b[1];
  return (x * x) + (y * y);
}

// Return the counterclockwise angle in the range (-pi, pi)
// between the positive X axis and the line intersecting a and b.
export function geoVecAngle(a, b) {
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

// 2D cross product of OA and OB vectors, returns magnitude of Z vector
// Returns a positive value, if OAB makes a counter-clockwise turn,
// negative for clockwise turn, and zero if the points are collinear.
export function geoVecCross(a, b, origin) {
  origin = origin || [0, 0];
  var p = geoVecSubtract(a, origin);
  var q = geoVecSubtract(b, origin);
  return (p[0]) * (q[1]) - (p[1]) * (q[0]);
}
