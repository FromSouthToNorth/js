import './css/iD.css';
import { coreContext } from './modules/core';

const container = document.getElementById('app');
const context = coreContext().assetPath('').containerNode(container);
window.context = window.id = context;
/** 错误写法，再次调用 coreContext() 会导致 coreContext 初始化  */
// coreContext().init(); //
context.init();
