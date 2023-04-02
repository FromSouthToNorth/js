import { remove as removeDiacritics } from 'diacritics';

import { utilDetect } from './detect.js';
import { geoExtent } from '../geo/index.js';
import { presetManager } from '../presets/index.js';
import { localizer, t } from '../core/index.js';

export function utilStringQs(str) {
  let i = 0;  // advance past any leading '?' or '#' characters
  while (i < str.length && (str[i] === '?' || str[i] === '#')) i++;
  str = str.slice(i);

  return str.split('&')
    .reduce((obj, pair) => {
      const parts = pair.split('=');
      if (parts.length === 2) {
        obj[parts[0]] = (null === parts[1]) ? '' : decodeURIComponent(parts[1]);
      }
      return obj;
    }, {});
}

export function utilEntitySelector(ids) {
  return ids.length ? '.' + ids.join(',.') : 'nothing';
}

// returns an selector to select entity ids for:
//  - entityIDs passed in
//  - deep descendant entityIDs for any of those entities that are relations
export function utilEntityOrDeepMemberSelector(ids, graph) {
  return utilEntitySelector(utilEntityAndDeepMemberIDs(ids, graph));
}

export function utilTotalExtent(array, graph) {
  let extent = geoExtent();
  let val, entity;
  for (let i = 0; i < array.length; i++) {
    val = array[i];
    entity = typeof val === 'string' ? graph.hasEntity(val) : val;
    if (entity) {
      extent._extend(entity.extent(graph));
    }
  }
  return extent;
}

// returns an Array that is the union of:
//  - nodes for any nodeIDs passed in
//  - child nodes of any wayIDs passed in
//  - descendant member and child nodes of relationIDs passed in
export function utilGetAllNodes(ids, graph) {
  let seen = new Set();
  let nodes = new Set();

  ids.forEach(collectNodes);
  return Array.from(nodes);

  function collectNodes(id) {
    if (seen.has(id)) return;
    seen.add(id);

    let entity = graph.hasEntity(id);
    if (!entity) return;

    if (entity.type === 'node') {
      nodes.add(entity);
    }
    else if (entity.type === 'way') {
      entity.nodes.forEach(collectNodes);
    }
    else {
      entity.members.map(function(member) {
        return member.id;
      })
        .forEach(collectNodes);   // recurse
    }
  }
}

export function utilQsString(obj, noencode) {
  // encode everything except special characters used in certain hash parameters:
  // "/" in map states, ":", ",", {" and "}" in background
  function softEncode(s) {
    return encodeURIComponent(s)
      .replace(/(%2F|%3A|%2C|%7B|%7D)/g, decodeURIComponent);
  }

  return Object.keys(obj)
    .sort()
    .map((key) => {
      return encodeURIComponent(key) + '=' + (
        noencode ? softEncode(obj[key]) : encodeURIComponent(obj[key]));
    })
    .join('&');
}

// returns an selector to select entity ids for:
//  - entityIDs passed in
//  - deep descendant entityIDs for any of those entities that are relations
export function utilEntityAndDeepMemberIDs(ids, graph) {
  let seen = new Set();
  ids.forEach(collectDeepDescendants);
  return Array.from(seen);

  function collectDeepDescendants(id) {
    if (seen.has(id)) return;
    seen.add(id);

    let entity = graph.hasEntity(id);
    if (!entity || entity.type !== 'relation') return;

    entity.members.map(function(member) {
      return member.id;
    })
      .forEach(collectDeepDescendants);   // recurse
  }
}

// returns an selector to select entity ids for:
//  - deep descendant entityIDs for any of those entities that are relations
export function utilDeepMemberSelector(ids, graph, skipMultipolgonMembers) {
  let idsSet = new Set(ids);
  let seen = new Set();
  let returners = new Set();
  ids.forEach(collectDeepDescendants);
  return utilEntitySelector(Array.from(returners));

  function collectDeepDescendants(id) {
    if (seen.has(id)) return;
    seen.add(id);

    if (!idsSet.has(id)) {
      returners.add(id);
    }

    let entity = graph.hasEntity(id);
    if (!entity || entity.type !== 'relation') return;
    if (skipMultipolgonMembers && entity.isMultipolygon()) return;
    entity.members.map(function(member) {
      return member.id;
    })
      .forEach(collectDeepDescendants);   // recurse
  }
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

  return function(e) {
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
  return function() {
    return value;
  };
}

export function utilPrefixCSSProperty(property) {
  let prefixes = ['webkit', 'ms', 'Moz', 'O'];
  let i = -1;
  let n = prefixes.length;
  let s = document.body.style;

  if (property.toLowerCase() in s) {
    return property.toLowerCase();
  }

  while (++i < n) {
    if (prefixes[i] + property in s) {
      return '-' + prefixes[i].toLowerCase() +
        property.replace(/([A-Z])/g, '-$1')
          .toLowerCase();
    }
  }

  return false;
}

let transformProperty;

export function utilSetTransform(el, x, y, scale) {
  const prop = transformProperty = transformProperty ||
    utilPrefixCSSProperty('Transform');
  const translate = utilDetect().opera ?
    'translate(' + x + 'px,' + y + 'px)'
    :
    'translate3d(' + x + 'px,' + y + 'px,0)';
  return el.style(prop, translate + (scale ? ' scale(' + scale + ')' : ''));
}

// Returns a new string representing `str` cut from its start to `limit` length
// in unicode characters. Note that this runs the risk of splitting graphemes.
export function utilUnicodeCharsTruncated(str, limit) {
  return Array.from(str)
    .slice(0, limit)
    .join('');
}

// returns a normalized and truncated string to `maxChars` utf-8 characters
export function utilCleanOsmString(val, maxChars) {
  // be lenient with input
  if (val === undefined || val === null) {
    val = '';
  }
  else {
    val = val.toString();
  }

  // remove whitespace
  val = val.trim();

  // use the canonical form of the string
  if (val.normalize) val = val.normalize('NFC');

  // trim to the number of allowed characters
  return utilUnicodeCharsTruncated(val, maxChars);
}

export function utilDisplayName(entity) {
  let localizedNameKey = 'name:' + localizer.languageCode()
    .toLowerCase();
  let name = entity.tags[localizedNameKey] || entity.tags.name || '';
  if (name) return name;

  let tags = {
    direction: entity.tags.direction,
    from: entity.tags.from,
    network: entity.tags.cycle_network || entity.tags.network,
    ref: entity.tags.ref,
    to: entity.tags.to,
    via: entity.tags.via,
  };
  let keyComponents = [];

  if (tags.network) {
    keyComponents.push('network');
  }
  if (tags.ref) {
    keyComponents.push('ref');
  }

  // Routes may need more disambiguation based on direction or destination
  if (entity.tags.route) {
    if (tags.direction) {
      keyComponents.push('direction');
    }
    else if (tags.from && tags.to) {
      keyComponents.push('from');
      keyComponents.push('to');
      if (tags.via) {
        keyComponents.push('via');
      }
    }
  }

  if (keyComponents.length) {
    name = t('inspector.display_name.' + keyComponents.join('_'), tags);
  }

  return name;
}

export function utilDisplayNameForPath(entity) {
  let name = utilDisplayName(entity);
  let isFirefox = utilDetect()
    .browser
    .toLowerCase()
    .indexOf('firefox') > -1;
  let isNewChromium = Number(utilDetect()
    .version
    .split('.')[0]) >= 96.0;

  if (!isFirefox && !isNewChromium && name && rtlRegex.test(name)) {
    name = fixRTLTextForSvg(name);
  }

  return name;
}

export function utilDisplayType(id) {
  return {
    n: t('inspector.node'),
    w: t('inspector.way'),
    r: t('inspector.relation'),
  }[id.charAt(0)];
}

// `utilDisplayLabel`
// Returns a string suitable for display
// By default returns something like name/ref, fallback to preset type, fallback to OSM type
//   "Main Street" or "Tertiary Road"
// If `verbose=true`, include both preset name and feature name.
//   "Tertiary Road Main Street"
//
export function utilDisplayLabel(entity, graphOrGeometry, verbose) {
  let result;
  let displayName = utilDisplayName(entity);
  let preset = typeof graphOrGeometry === 'string' ?
    presetManager.matchTags(entity.tags, graphOrGeometry) :
    presetManager.match(entity, graphOrGeometry);
  let presetName = preset &&
    (preset.suggestion ? preset.subtitle() : preset.name());

  if (verbose) {
    result = [presetName, displayName].filter(Boolean)
      .join(' ');
  }
  else {
    result = displayName || presetName;
  }

  // Fallback to the OSM type (node/way/relation)
  return result || utilDisplayType(entity.id);
}

// Calculates Levenshtein distance between two strings
// see:  https://en.wikipedia.org/wiki/Levenshtein_distance
// first converts the strings to lowercase and replaces diacritic marks with ascii equivalents.
export function utilEditDistance(a, b) {
  a = removeDiacritics(a.toLowerCase());
  b = removeDiacritics(b.toLowerCase());
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let matrix = [];
  let i, j;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      }
      else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1)); // deletion
      }
    }
  }
  return matrix[b.length][a.length];
}

export function utilNoAuto(selection) {
  let isText = (selection.size() && selection.node()
      .tagName
      .toLowerCase() ===
    'textarea');

  return selection
    // assign 'new-password' even for non-password fields to prevent browsers (Chrome) ignoring 'off'
    .attr('autocomplete', 'new-password')
    .attr('autocorrect', 'off')
    .attr('autocapitalize', 'off')
    .attr('spellcheck', isText ? 'true' : 'false');
}

// https://stackoverflow.com/questions/194846/is-there-any-kind-of-hash-code-function-in-javascript
// https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
export function utilHashcode(str) {
  let hash = 0;
  if (str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Returns version of `str` with all runs of special characters replaced by `_`;
// suitable for HTML ids, classes, selectors, etc.
export function utilSafeClassName(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}
