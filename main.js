// import 'leaflet/dist/leaflet.css';
// import 'leaflet';
// import 'leaflet.markercluster';
// import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
// import '@turf/turf';
// import 'leaflet.layerscontrol-minimap';
// import 'leaflet.layerscontrol-minimap/control.layers.minimap.css';
// import 'leaflet-measure/dist/leaflet-measure.css';
// import 'leaflet-measure/dist/leaflet-measure.cn';
import './css/style.css';
import { coreContext } from './modules/core';

document.querySelector('#app').innerHTML = `<div id="id-container"></div>`;

const container = document.getElementById('map-container');
const context = coreContext().containerNode(container);
coreContext().init();
console.log('context: ', context);
