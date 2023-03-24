import serviceNominatim from './nominatim';
import serviceImproveOSM from './improveOSM';
import serviceOsm from './osm';
import serviceVectorTile from './vector_tile';
import serviceWikidata from './wikidata';
import serviceWikipedia from './wikipedia';
import serviceTaginfo from './taginfo';

export let services = {
  geocoder: serviceNominatim,
  improveOSM: serviceImproveOSM,
  osm: serviceOsm,
  vectorTile: serviceVectorTile,
  wikidata: serviceWikidata,
  taginfo: serviceTaginfo,
  wikipedia: serviceWikipedia,
};

export {
  serviceNominatim,
  serviceImproveOSM,
  serviceOsm,
  serviceVectorTile,
  serviceWikipedia,
  serviceWikidata,
  serviceTaginfo,
};
