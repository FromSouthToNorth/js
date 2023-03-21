import 'leaflet/dist/leaflet.css';
import 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import '@turf/turf';
import 'leaflet.layerscontrol-minimap';
import 'leaflet.layerscontrol-minimap/control.layers.minimap.css';
import 'leaflet-measure/dist/leaflet-measure.css';
import 'leaflet-measure/dist/leaflet-measure.cn';
import './css/style.css';
import { coreContext } from './modules/core';

document.querySelector('#app').innerHTML = `
<svg>
<defs>
<marker id="ideditor-oneway-marker" viewBox="0 0 10 5" refX="2.5" refY="2.5" markerWidth="2" markerHeight="2" markerUnits="strokeWidth" orient="auto"><path class="oneway-marker-path" d="M 5,3 L 0,3 L 0,2 L 5,2 L 5,0 L 10,2.5 L 5,5 z" stroke="none" fill="#000" opacity="0.75"></path></marker>
</defs>
</svg>
<div id="map-container">
</div>
`;

const container = document.getElementById('map-container');
const context = coreContext().containerNode(container);
coreContext().init();
console.log('context: ', context);
