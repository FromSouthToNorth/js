import { utilDetect } from './detect.js';

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

/**
 * 一个 d3.mouse-like
 * 1.仅适用于 HTML 元素，不适用于 SVG
 * 2.不会引起样式重新计算
 * @param container
 */
export function utilFastMouse(container) {
  const rect = container.getBoundingClientRect(),
    rectLeft = rect.left,
    rectTop = rect.top,
    clientLeft = +container.clientLeft,
    clientTop = +container.clientTop;

  return function (e) {
    return [
      e.clientX - rectLeft - clientLeft,
      e.clientY - rectTop - clientTop,
    ];
  };
}

export function utilFunctor(value) {
  if (typeof value === 'function') {
    return value;
  }
  return function () {
    return value;
  }
}

let transformProperty;
export function utilSetTransform(el, x, y, scale) {
  const prop = transformProperty = transformProperty || utilPrefixCSSProperty('Transform');
  const translate = utilDetect().opera ? 'translate('   + x + 'px,' + y + 'px)'
    : 'translate3d(' + x + 'px,' + y + 'px,0)';
  return el.style(prop, translate + (scale ? ' scale(' + scale + ')' : ''));
}

// Returns a new string representing `str` cut from its start to `limit` length
// in unicode characters. Note that this runs the risk of splitting graphemes.
export function utilUnicodeCharsTruncated(str, limit) {
  return Array.from(str).slice(0, limit).join('');
}
