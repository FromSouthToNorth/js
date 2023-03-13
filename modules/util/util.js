export function utilStringQs(str) {
  let i = 0;  // advance past any leading '?' or '#' characters
  while (i < str.length && (str[i] === '?' || str[i] === '#')) i++;
  str = str.slice(i);

  return str.split('&').reduce((obj, pair) => {
    const parts = pair.split('=');
    if (parts.length === 2) {
      obj[parts[0]] = (null === parts[1]) ? '' : decodeURIComponent(parts[1]);
    }
    return obj;
  }, {});
}

export function utilQsString(obj, noencode) {
  // encode everything except special characters used in certain hash parameters:
  // "/" in map states, ":", ",", {" and "}" in background
  function softEncode(s) {
    return encodeURIComponent(s).replace(/(%2F|%3A|%2C|%7B|%7D)/g, decodeURIComponent);
  }

  return Object.keys(obj).sort().map((key) => {
    return encodeURIComponent(key) + '=' + (
      noencode ? softEncode(obj[key]) : encodeURIComponent(obj[key]));
  }).join('&');
}
