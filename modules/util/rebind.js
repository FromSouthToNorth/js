// Copies a variable number of methods from source to target.
export function utilRebind(target, source) {
  let i = 1, n = arguments.length, method;
  while (++i < n) {
    target[method = arguments[i]] = d3_rebind(target, source, source[method]);
  }
  return target;
}

// Method is assumed to be a standard D3 getter-setter:
// If passed with no arguments, gets the value.
// If passed with arguments, sets the value and returns the target.
function d3_rebind(target, source, method) {
  return function() {
    const value = method.apply(source, arguments);
    return value === source ? target : value;
  };
}
