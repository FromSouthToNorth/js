import { actionCopyEntities } from '../actions/index.js';
import { actionMove } from '../actions/move';
import { geoExtent, geoPointInPolygon, geoVecSubtract } from '../geo';
import { modeMove } from '../modes/move';
import { uiCmd } from '../ui/cmd';

// see also `operationPaste`
export function behaviorPaste(context) {

  function doPaste(d3_event) {
    // prevent paste during low zoom selection
    if (!context.map().withinEditableZoom()) return;

    d3_event.preventDefault();

    let baseGraph = context.graph();
    let mouse = context.map().mouse();
    let projection = context.projection;
    let viewport = geoExtent(projection.clipExtent()).polygon();

    if (!geoPointInPolygon(mouse, viewport)) return;

    let oldIDs = context.copyIDs();
    if (!oldIDs.length) return;

    let extent = geoExtent();
    let oldGraph = context.copyGraph();
    let newIDs = [];

    let action = actionCopyEntities(oldIDs, oldGraph);
    context.perform(action);

    let copies = action.copies();
    let originals = new Set();
    Object.values(copies).forEach(function (entity) {
      originals.add(entity.id);
    });

    for (let id in copies) {
      let oldEntity = oldGraph.entity(id);
      let newEntity = copies[id];

      extent._extend(oldEntity.extent(oldGraph));

      // Exclude child nodes from newIDs if their parent way was also copied.
      let parents = context.graph().parentWays(newEntity);
      let parentCopied = parents.some(function (parent) {
        return originals.has(parent.id);
      });

      if (!parentCopied) {
        newIDs.push(newEntity.id);
      }
    }

    // Put pasted objects where mouse pointer is..
    let copyPoint = (context.copyLonLat() && projection(context.copyLonLat())) || projection(extent.center());
    let delta = geoVecSubtract(mouse, copyPoint);

    context.perform(actionMove(newIDs, delta, projection));
    context.enter(modeMove(context, newIDs, baseGraph));
  }


  function behavior() {
    context.keybinding().on(uiCmd('⌘V'), doPaste);
    return behavior;
  }


  behavior.off = function () {
    context.keybinding().off(uiCmd('⌘V'));
  };


  return behavior;

}