import { t, localizer } from '../core/localizer';

const OSM_PRECISION = 7;

/**
 * Returns a localized representation of the given length measurement.
 *
 * @param {Number} m area in meters
 * @param {Boolean} isImperial true for U.S. customary units; false for metric
 */
export function displayLength(m, isImperial) {
  let d = m * (isImperial ? 3.28084 : 1);
  let unit;

  if (isImperial) {
    if (d >= 5280) {
      d /= 5280;
      unit = 'miles';
    }
    else {
      unit = 'feet';
    }
  }
  else {
    if (d >= 1000) {
      d /= 1000;
      unit = 'kilometers';
    }
    else {
      unit = 'meters';
    }
  }

  return t('units.' + unit, {
    quantity: d.toLocaleString(localizer.localeCode(), {
      maximumSignificantDigits: 4,
    }),
  });
}

/**
 * Returns a localized representation of the given area measurement.
 *
 * @param {Number} m2 area in square meters
 * @param {Boolean} isImperial true for U.S. customary units; false for metric
 */
export function displayArea(m2, isImperial) {
  const locale = localizer.localeCode();
  const d = m2 * (isImperial ? 10.7639111056 : 1);
  let d1, d2, area;
  let unit1;
  let unit2 = '';

  if (isImperial) {
    if (d >= 6969600) { // > 0.25mi² show mi²
      d1 = d / 27878400;
      unit1 = 'square_miles';
    }
    else {
      d1 = d;
      unit1 = 'square_feet';
    }

    if (d > 4356 && d < 43560000) { // 0.1 - 1000 acres
      d2 = d / 43560;
      unit2 = 'acres';
    }

  }
  else {
    if (d >= 250000) { // > 0.25km² show km²
      d1 = d / 1000000;
      unit1 = 'square_kilometers';
    }
    else {
      d1 = d;
      unit1 = 'square_meters';
    }

    if (d > 1000 && d < 10000000) { // 0.1 - 1000 hectares
      d2 = d / 10000;
      unit2 = 'hectares';
    }
  }

  area = t('units.' + unit1, {
    quantity: d1.toLocaleString(locale, {
      maximumSignificantDigits: 4,
    }),
  });

  if (d2) {
    return t('units.area_pair', {
      area1: area,
      area2: t('units.' + unit2, {
        quantity: d2.toLocaleString(locale, {
          maximumSignificantDigits: 2,
        }),
      }),
    });
  }
  else {
    return area;
  }
}

function wrap(x, min, max) {
  const d = max - min;
  return ((x - min) % d + d) % d + min;
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(x, max));
}

function displayCoordinate(deg, pos, neg) {
  const locale = localizer.localeCode();
  const min = (Math.abs(deg) - Math.floor(Math.abs(deg))) * 60;
  const sec = (min - Math.floor(min)) * 60;
  const displayDegrees = t('units.arcdegrees', {
    quantity: Math.floor(Math.abs(deg)).toLocaleString(locale),
  });
  let displayCoordinate;

  if (Math.floor(sec) > 0) {
    displayCoordinate = displayDegrees +
      t('units.arcminutes', {
        quantity: Math.floor(min).toLocaleString(locale),
      }) +
      t('units.arcseconds', {
        quantity: Math.round(sec).toLocaleString(locale),
      });
  }
  else if (Math.floor(min) > 0) {
    displayCoordinate = displayDegrees +
      t('units.arcminutes', {
        quantity: Math.round(min).toLocaleString(locale),
      });
  }
  else {
    displayCoordinate = t('units.arcdegrees', {
      quantity: Math.round(Math.abs(deg)).toLocaleString(locale),
    });
  }

  if (deg === 0) {
    return displayCoordinate;
  }
  else {
    return t('units.coordinate', {
      coordinate: displayCoordinate,
      direction: t('units.' + (deg > 0 ? pos : neg)),
    });
  }
}

/**
 * Returns given coordinate pair in degree-minute-second format.
 *
 * @param {Array<Number>} coord longitude and latitude
 */
export function dmsCoordinatePair(coord) {
  return t('units.coordinate_pair', {
    latitude: displayCoordinate(clamp(coord[1], -90, 90), 'north', 'south'),
    longitude: displayCoordinate(wrap(coord[0], -180, 180), 'east', 'west'),
  });
}


/**
 * Returns the given coordinate pair in decimal format.
 * note: unlocalized to avoid comma ambiguity - see #4765
 *
 * @param {Array<Number>} coord longitude and latitude
 */
export function decimalCoordinatePair(coord) {
  return t('units.coordinate_pair', {
    latitude: clamp(coord[1], -90, 90).toFixed(OSM_PRECISION),
    longitude: wrap(coord[0], -180, 180).toFixed(OSM_PRECISION),
  });
}
