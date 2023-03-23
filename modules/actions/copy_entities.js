export function actionCopyEntities(ids, fromGraph) {
  let _copies = {};

  let action = function(graph) {
    ids.forEach(function(id) {
      fromGraph.entity(id).copy(fromGraph, _copies);
    });

    for (let id in _copies) {
      graph = graph.replace(_copies[id]);
    }

    return graph;
  };

  action.copies = function() {
    return _copies;
  };

  return action;
}
