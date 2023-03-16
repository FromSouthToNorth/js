import _throttle from 'lodash-es/throttle';
import { utilQsString, utilStringQs, utilObjectOmit } from '../util';

export function behaviorHash(context) {

  function computedHashParameters() {
    const map = context.map(),
      center = map.getCenter(),
      zoom = map.getZoom(),
      precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2)),
      oldParams = utilObjectOmit(utilStringQs(window.location.hash),
        ['comment', 'source', 'hashtags', 'walkthrough']),
      newParams = {};

    newParams.map = zoom.toFixed(2) +
      '/' + center.lat.toFixed(precision) +
      '/' + center.lng.toFixed(precision);

    return Object.assign(oldParams, newParams);
  }

  function computedHash() {
    return '#' + utilQsString(computedHashParameters(), true);
  }

  function updateHashIfNeeded() {
    let latestHash = computedHash();
    window.history.replaceState(null, null, latestHash);
  }

  const _throttledUpdate = _throttle(updateHashIfNeeded, 500);

  function behavior() {
    _throttledUpdate();
    context.map()
           .on('moveend', _throttledUpdate);
  }

  behavior.off = function () {
    _throttledUpdate.cancel();
    context.map()
           .off('load', _throttledUpdate);
    context.map()
           .off('moveend', _throttledUpdate);
  };

  return behavior;

}
