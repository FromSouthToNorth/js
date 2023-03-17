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
import { rendererMap, rendererBackground, rendererLayers } from './modules/renderer';
import { behaviorHash } from './modules/behavior';
import * as d3 from 'd3';

document.querySelector('#app').innerHTML = `
<div id="map-container"></div>
`;

console.log(coreContext());

/** 初始化地图 */
const { init, _map } = rendererMap();
init('map-container');
const map = _map();
console.log(map);

/** 初始化图层 */
const background = rendererBackground({ map: _map });
background();

/** 更新路径参数 */
const behavior = behaviorHash({ map: _map });
behavior();

const layers = rendererLayers({ map: _map, isFitBounds: true });
layers.initPointData();
