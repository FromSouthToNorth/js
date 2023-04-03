import serviceOsm from './osm';
import serviceNominatim from './nominatim';

export let services = {
  geocoder: serviceNominatim,
  osm: serviceOsm,
};

export {
  serviceNominatim,
  serviceOsm,
};
