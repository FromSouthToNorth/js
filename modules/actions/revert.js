import { actionDeleteRelation } from './delete_relation';
import { actionDeleteWay } from './delete_way';


export function actionRevert(id) {
  return function (graph) {
    const entity = graph.hasEntity(id),
      base = graph.base().entities[id];

    if (entity && !base) {    // entity will be removed..
      if (entity.type === 'node') {
        graph.parentWays(entity).forEach(function (parent) {
          parent = parent.removeNode(id);
          graph = graph.replace(parent);

          if (parent.isDegenerate()) {
            graph = actionDeleteWay(parent.id)(graph);
          }
        });
      }

      graph.parentRelations(entity).forEach(function (parent) {
        parent = parent.removeMembersWithID(id);
        graph = graph.replace(parent);

        if (parent.isDegenerate()) {
          graph = actionDeleteRelation(parent.id)(graph);
        }
      });
    }

    return graph.revert(id);
  };
}
