import { dispatch as d3_dispatch } from 'd3-dispatch';

import deepEqual from 'fast-deep-equal';
import turf_bboxClip from '@turf/bbox-clip';
import stringify from 'fast-json-stable-stringify';
import polygonClipping from 'polygon-clipping';

import Protobuf from 'pbf';
import vt from '@mapbox/vector-tile';

import { utilHashcode, utilRebind, utilTiler } from '../util';

const tiler = utilTiler().tileSize(512).margin(1);
const dispatch = d3_dispatch('loadedData');
let _vtCache;

function abortRequest(controller) {
  controller.abort();
}

function vtToGeoJSON(data, tile, mergeCache) {
  let vectorTile = new vt.VectorTile(new Protobuf(data));
  let layers = Object.keys(vectorTile.layers);
  if (!Array.isArray(layers)) {
    layers = [layers];
  }

  let features = [];
  layers.forEach(function(layerID) {
    let layer = vectorTile.layers[layerID];
    if (layer) {
      for (let i = 0; i < layer.length; i++) {
        let feature = layer.feature(i).
            toGeoJSON(tile.xyz[0], tile.xyz[1], tile.xyz[2]);
        let geometry = feature.geometry;

        // Treat all Polygons as MultiPolygons
        if (geometry.type === 'Polygon') {
          geometry.type = 'MultiPolygon';
          geometry.coordinates = [geometry.coordinates];
        }

        let isClipped = false;

        // Clip to tile bounds
        if (geometry.type === 'MultiPolygon') {
          let featureClip = turf_bboxClip(feature, tile.extent.rectangle());
          if (!deepEqual(feature.geometry, featureClip.geometry)) {
            // feature = featureClip;
            isClipped = true;
          }
          if (!feature.geometry.coordinates.length) continue;   // not actually on this tile
          if (!feature.geometry.coordinates[0].length) continue;   // not actually on this tile
        }

        // Generate some unique IDs and add some metadata
        let featurehash = utilHashcode(stringify(feature));
        let propertyhash = utilHashcode(stringify(feature.properties || {}));
        feature.__layerID__ = layerID.replace(/[^_a-zA-Z0-9\-]/g, '_');
        feature.__featurehash__ = featurehash;
        feature.__propertyhash__ = propertyhash;
        features.push(feature);

        // Clipped Polygons at same zoom with identical properties can get merged
        if (isClipped && geometry.type === 'MultiPolygon') {
          let merged = mergeCache[propertyhash];
          if (merged && merged.length) {
            let other = merged[0];
            let coords = polygonClipping.union(
                feature.geometry.coordinates,
                other.geometry.coordinates,
            );

            if (!coords || !coords.length) {
              continue;  // something failed in polygon union
            }

            merged.push(feature);
            for (let j = 0; j < merged.length; j++) {      // all these features get...
              merged[j].geometry.coordinates = coords;   // same coords
              merged[j].__featurehash__ = featurehash;   // same hash, so deduplication works
            }
          }
          else {
            mergeCache[propertyhash] = [feature];
          }
        }
      }
    }
  });

  return features;
}

function loadTile(source, tile) {
  if (source.loaded[tile.id] || source.inflight[tile.id]) return;

  let url = source.template.replace('{x}', tile.xyz[0]).
      replace('{y}', tile.xyz[1])
      // TMS-flipped y coordinate
      .replace(/\{[t-]y\}/, Math.pow(2, tile.xyz[2]) - tile.xyz[1] - 1).
      replace(/\{z(oom)?\}/, tile.xyz[2]).
      replace(/\{switch:([^}]+)\}/, function(s, r) {
        let subdomains = r.split(',');
        return subdomains[(tile.xyz[0] + tile.xyz[1]) % subdomains.length];
      });

  let controller = new AbortController();
  source.inflight[tile.id] = controller;

  fetch(url, { signal: controller.signal }).then(function(response) {
    if (!response.ok) {
      throw new Error(response.status + ' ' + response.statusText);
    }
    source.loaded[tile.id] = [];
    delete source.inflight[tile.id];
    return response.arrayBuffer();
  }).then(function(data) {
    if (!data) {
      throw new Error('No Data');
    }

    let z = tile.xyz[2];
    if (!source.canMerge[z]) {
      source.canMerge[z] = {};  // initialize mergeCache
    }

    source.loaded[tile.id] = vtToGeoJSON(data, tile, source.canMerge[z]);
    dispatch.call('loadedData');
  }).catch(function() {
    source.loaded[tile.id] = [];
    delete source.inflight[tile.id];
  });
}

export default {

  init: function() {
    if (!_vtCache) {
      this.reset();
    }

    this.event = utilRebind(this, dispatch, 'on');
  },

  reset: function() {
    for (let sourceID in _vtCache) {
      let source = _vtCache[sourceID];
      if (source && source.inflight) {
        Object.values(source.inflight).forEach(abortRequest);
      }
    }

    _vtCache = {};
  },

  addSource: function(sourceID, template) {
    _vtCache[sourceID] = {
      template: template,
      inflight: {},
      loaded: {},
      canMerge: {},
    };
    return _vtCache[sourceID];
  },

  data: function(sourceID, projection) {
    let source = _vtCache[sourceID];
    if (!source) return [];

    let tiles = tiler.getTiles(projection);
    let seen = {};
    let results = [];

    for (let i = 0; i < tiles.length; i++) {
      let features = source.loaded[tiles[i].id];
      if (!features || !features.length) continue;

      for (let j = 0; j < features.length; j++) {
        let feature = features[j];
        let hash = feature.__featurehash__;
        if (seen[hash]) continue;
        seen[hash] = true;

        // return a shallow copy, because the hash may change
        // later if this feature gets merged with another
        results.push(Object.assign({}, feature));  // shallow copy
      }
    }

    return results;
  },

  loadTiles: function(sourceID, template, projection) {
    let source = _vtCache[sourceID];
    if (!source) {
      source = this.addSource(sourceID, template);
    }

    let tiles = tiler.getTiles(projection);

    // abort inflight requests that are no longer needed
    Object.keys(source.inflight).forEach(function(k) {
      let wanted = tiles.find(function(tile) {
        return k === tile.id;
      });
      if (!wanted) {
        abortRequest(source.inflight[k]);
        delete source.inflight[k];
      }
    });

    tiles.forEach(function(tile) {
      loadTile(source, tile);
    });
  },

  cache: function() {
    return _vtCache;
  },

};
