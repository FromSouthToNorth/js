export function utilObjectOmit(obj, omitKeys) {
  return Object.keys(obj)
    .reduce((result, key) => {
      if (!omitKeys.includes(key)) {
        result[key] = obj[key]; // keep
      }
      return result;
    }, {});
}
