import { t } from '../core/localizer';
import { behaviorOperation } from '../behavior/index.js';
import { modeMove } from '../modes/move';
import { utilGetAllNodes, utilTotalExtent } from '../util/util';

export function operationMove(context, selectedIDs) {
  let multi = (selectedIDs.length === 1 ? 'single' : 'multiple');
  let nodes = utilGetAllNodes(selectedIDs, context.graph());
  let coords = nodes.map(function(n) {
    return n.loc;
  });
  let extent = utilTotalExtent(selectedIDs, context.graph());

  let operation = function() {
    context.enter(modeMove(context, selectedIDs));
  };

  operation.available = function() {
    return selectedIDs.length > 0;
  };

  operation.disabled = function() {
    if (extent.percentContainedIn(context.map().extent()) < 0.8) {
      return 'too_large';
    }
    else if (someMissing()) {
      return 'not_downloaded';
    }
    else if (selectedIDs.some(context.hasHiddenConnections)) {
      return 'connected_to_hidden';
    }
    else if (selectedIDs.some(incompleteRelation)) {
      return 'incomplete_relation';
    }

    return false;

    function someMissing() {
      if (context.inIntro()) return false;
      let osm = context.connection();
      if (osm) {
        let missing = coords.filter(function(loc) {
          return !osm.isDataLoaded(loc);
        });
        if (missing.length) {
          missing.forEach(function(loc) {
            context.loadTileAtLoc(loc);
          });
          return true;
        }
      }
      return false;
    }

    function incompleteRelation(id) {
      let entity = context.entity(id);
      return entity.type === 'relation' && !entity.isComplete(context.graph());
    }
  };

  operation.tooltip = function() {
    let disable = operation.disabled();
    return disable ?
           t.append('operations.move.' + disable + '.' + multi) :
           t.append('operations.move.description.' + multi);
  };

  operation.annotation = function() {
    return selectedIDs.length === 1 ?
           t('operations.move.annotation.' +
               context.graph().geometry(selectedIDs[0])) :
           t('operations.move.annotation.feature', { n: selectedIDs.length });
  };

  operation.id = 'move';
  operation.keys = [t('operations.move.key')];
  operation.title = t.append('operations.move.title');
  operation.behavior = behaviorOperation(context).which(operation);

  operation.mouseOnly = true;

  return operation;
}