import {
  geoAngle, geoChooseEdge, geoPathIntersections, geoPathLength,
  geoVecAdd, geoVecEqual, geoVecInterp, geoVecSubtract,
} from '../geo';

import { osmNode } from '../osm/node';
import { utilArrayIntersection } from '../util';

// https://github.com/openstreetmap/josm/blob/mirror/src/org/openstreetmap/josm/command/MoveCommand.java
// https://github.com/openstreetmap/potlatch2/blob/master/net/systemeD/halcyon/connection/actions/MoveNodeAction.as
export function actionMove(moveIDs, tryDelta, projection, cache) {
  let _delta = tryDelta;

  function setupCache(graph) {
    function canMove(nodeID) {
      // Allow movement of any node that is in the selectedIDs list..
      if (moveIDs.indexOf(nodeID) !== -1) return true;

      // Allow movement of a vertex where 2 ways meet..
      let parents = graph.parentWays(graph.entity(nodeID));
      if (parents.length < 3) return true;

      // Restrict movement of a vertex where >2 ways meet, unless all parentWays are moving too..
      let parentsMoving = parents.every(function (way) { return cache.moving[way.id]; });
      if (!parentsMoving) delete cache.moving[nodeID];

      return parentsMoving;
    }

    function cacheEntities(ids) {
      for (let i = 0; i < ids.length; i++) {
        let id = ids[i];
        if (cache.moving[id]) continue;
        cache.moving[id] = true;

        let entity = graph.hasEntity(id);
        if (!entity) continue;

        if (entity.type === 'node') {
          cache.nodes.push(id);
          cache.startLoc[id] = entity.loc;
        }
        else if (entity.type === 'way') {
          cache.ways.push(id);
          cacheEntities(entity.nodes);
        }
        else {
          cacheEntities(entity.members.map(function (member) {
            return member.id;
          }));
        }
      }
    }

    function cacheIntersections(ids) {
      function isEndpoint(way, id) {
        return !way.isClosed() && !!way.affix(id);
      }

      for (let i = 0; i < ids.length; i++) {
        let id = ids[i];

        // consider only intersections with 1 moved and 1 unmoved way.
        let childNodes = graph.childNodes(graph.entity(id));
        for (let j = 0; j < childNodes.length; j++) {
          let node = childNodes[j];
          let parents = graph.parentWays(node);
          if (parents.length !== 2) continue;

          let moved = graph.entity(id);
          let unmoved = null;
          for (let k = 0; k < parents.length; k++) {
            let way = parents[k];
            if (!cache.moving[way.id]) {
              unmoved = way;
              break;
            }
          }
          if (!unmoved) continue;

          // exclude ways that are overly connected..
          if (utilArrayIntersection(moved.nodes, unmoved.nodes).length > 2) continue;
          if (moved.isArea() || unmoved.isArea()) continue;

          cache.intersections.push({
            nodeId: node.id,
            movedId: moved.id,
            unmovedId: unmoved.id,
            movedIsEP: isEndpoint(moved, node.id),
            unmovedIsEP: isEndpoint(unmoved, node.id),
          });
        }
      }
    }


    if (!cache) {
      cache = {};
    }
    if (!cache.ok) {
      cache.moving = {};
      cache.intersections = [];
      cache.replacedVertex = {};
      cache.startLoc = {};
      cache.nodes = [];
      cache.ways = [];

      cacheEntities(moveIDs);
      cacheIntersections(cache.ways);
      cache.nodes = cache.nodes.filter(canMove);

      cache.ok = true;
    }
  }


  // Place a vertex where the moved vertex used to be, to preserve way shape..
  //
  //  Start:
  //      b ---- e
  //     / \
  //    /   \
  //   /     \
  //  a       c
  //
  //      *               node '*' added to preserve shape
  //     / \
  //    /   b ---- e      way `b,e` moved here:
  //   /     \
  //  a       c
  //
  //
  function replaceMovedVertex(nodeId, wayId, graph, delta) {
    let way = graph.entity(wayId);
    let moved = graph.entity(nodeId);
    let movedIndex = way.nodes.indexOf(nodeId);
    let len, prevIndex, nextIndex;

    if (way.isClosed()) {
      len = way.nodes.length - 1;
      prevIndex = (movedIndex + len - 1) % len;
      nextIndex = (movedIndex + len + 1) % len;
    }
    else {
      len = way.nodes.length;
      prevIndex = movedIndex - 1;
      nextIndex = movedIndex + 1;
    }

    let prev = graph.hasEntity(way.nodes[prevIndex]);
    let next = graph.hasEntity(way.nodes[nextIndex]);

    // Don't add orig vertex at endpoint..
    if (!prev || !next) return graph;

    let key = wayId + '_' + nodeId;
    let orig = cache.replacedVertex[key];
    if (!orig) {
      orig = osmNode();
      cache.replacedVertex[key] = orig;
      cache.startLoc[orig.id] = cache.startLoc[nodeId];
    }

    let start, end;
    if (delta) {
      start = projection(cache.startLoc[nodeId]);
      end = projection.invert(geoVecAdd(start, delta));
    }
    else {
      end = cache.startLoc[nodeId];
    }
    orig = orig.move(end);

    let angle = Math.abs(geoAngle(orig, prev, projection) -
      geoAngle(orig, next, projection)) * 180 / Math.PI;

    // Don't add orig vertex if it would just make a straight line..
    if (angle > 175 && angle < 185) return graph;

    // moving forward or backward along way?
    let p1 = [prev.loc, orig.loc, moved.loc, next.loc].map(projection);
    let p2 = [prev.loc, moved.loc, orig.loc, next.loc].map(projection);
    let d1 = geoPathLength(p1);
    let d2 = geoPathLength(p2);
    let insertAt = (d1 <= d2) ? movedIndex : nextIndex;

    // moving around closed loop?
    if (way.isClosed() && insertAt === 0) insertAt = len;

    way = way.addNode(orig.id, insertAt);
    return graph.replace(orig).replace(way);
  }


  // Remove duplicate vertex that might have been added by
  // replaceMovedVertex.  This is done after the unzorro checks.
  function removeDuplicateVertices(wayId, graph) {
    let way = graph.entity(wayId);
    let epsilon = 1e-6;
    let prev, curr;

    function isInteresting(node, graph) {
      return graph.parentWays(node).length > 1 ||
        graph.parentRelations(node).length ||
        node.hasInterestingTags();
    }

    for (let i = 0; i < way.nodes.length; i++) {
      curr = graph.entity(way.nodes[i]);

      if (prev && curr && geoVecEqual(prev.loc, curr.loc, epsilon)) {
        if (!isInteresting(prev, graph)) {
          way = way.removeNode(prev.id);
          graph = graph.replace(way).remove(prev);
        }
        else if (!isInteresting(curr, graph)) {
          way = way.removeNode(curr.id);
          graph = graph.replace(way).remove(curr);
        }
      }

      prev = curr;
    }

    return graph;
  }


  // Reorder nodes around intersections that have moved..
  //
  //  Start:                way1.nodes: b,e         (moving)
  //  a - b - c ----- d     way2.nodes: a,b,c,d     (static)
  //      |                 vertex: b
  //      e                 isEP1: true,  isEP2, false
  //
  //  way1 `b,e` moved here:
  //  a ----- c = b - d
  //              |
  //              e
  //
  //  reorder nodes         way1.nodes: b,e
  //  a ----- c - b - d     way2.nodes: a,c,b,d
  //              |
  //              e
  //
  function unZorroIntersection(intersection, graph) {
    let vertex = graph.entity(intersection.nodeId);
    let way1 = graph.entity(intersection.movedId);
    let way2 = graph.entity(intersection.unmovedId);
    let isEP1 = intersection.movedIsEP;
    let isEP2 = intersection.unmovedIsEP;

    // don't move the vertex if it is the endpoint of both ways.
    if (isEP1 && isEP2) return graph;

    let nodes1 = graph.childNodes(way1).filter(function (n) { return n !== vertex; });
    let nodes2 = graph.childNodes(way2).filter(function (n) { return n !== vertex; });

    if (way1.isClosed() && way1.first() === vertex.id) nodes1.push(nodes1[0]);
    if (way2.isClosed() && way2.first() === vertex.id) nodes2.push(nodes2[0]);

    let edge1 = !isEP1 && geoChooseEdge(nodes1, projection(vertex.loc), projection);
    let edge2 = !isEP2 && geoChooseEdge(nodes2, projection(vertex.loc), projection);
    let loc;

    // snap vertex to nearest edge (or some point between them)..
    if (!isEP1 && !isEP2) {
      let epsilon = 1e-6, maxIter = 10;
      for (let i = 0; i < maxIter; i++) {
        loc = geoVecInterp(edge1.loc, edge2.loc, 0.5);
        edge1 = geoChooseEdge(nodes1, projection(loc), projection);
        edge2 = geoChooseEdge(nodes2, projection(loc), projection);
        if (Math.abs(edge1.distance - edge2.distance) < epsilon) break;
      }
    }
    else if (!isEP1) {
      loc = edge1.loc;
    }
    else {
      loc = edge2.loc;
    }

    graph = graph.replace(vertex.move(loc));

    // if zorro happened, reorder nodes..
    if (!isEP1 && edge1.index !== way1.nodes.indexOf(vertex.id)) {
      way1 = way1.removeNode(vertex.id).addNode(vertex.id, edge1.index);
      graph = graph.replace(way1);
    }
    if (!isEP2 && edge2.index !== way2.nodes.indexOf(vertex.id)) {
      way2 = way2.removeNode(vertex.id).addNode(vertex.id, edge2.index);
      graph = graph.replace(way2);
    }

    return graph;
  }


  function cleanupIntersections(graph) {
    for (let i = 0; i < cache.intersections.length; i++) {
      let obj = cache.intersections[i];
      graph = replaceMovedVertex(obj.nodeId, obj.movedId, graph, _delta);
      graph = replaceMovedVertex(obj.nodeId, obj.unmovedId, graph, null);
      graph = unZorroIntersection(obj, graph);
      graph = removeDuplicateVertices(obj.movedId, graph);
      graph = removeDuplicateVertices(obj.unmovedId, graph);
    }

    return graph;
  }


  // check if moving way endpoint can cross an unmoved way, if so limit delta..
  function limitDelta(graph) {
    function moveNode(loc) {
      return geoVecAdd(projection(loc), _delta);
    }

    for (let i = 0; i < cache.intersections.length; i++) {
      let obj = cache.intersections[i];

      // Don't limit movement if this is vertex joins 2 endpoints..
      if (obj.movedIsEP && obj.unmovedIsEP) continue;
      // Don't limit movement if this vertex is not an endpoint anyway..
      if (!obj.movedIsEP) continue;

      let node = graph.entity(obj.nodeId);
      let start = projection(node.loc);
      let end = geoVecAdd(start, _delta);
      let movedNodes = graph.childNodes(graph.entity(obj.movedId));
      let movedPath = movedNodes.map(function (n) { return moveNode(n.loc); });
      let unmovedNodes = graph.childNodes(graph.entity(obj.unmovedId));
      let unmovedPath = unmovedNodes.map(function (n) { return projection(n.loc); });
      let hits = geoPathIntersections(movedPath, unmovedPath);

      for (let j = 0; i < hits.length; i++) {
        if (geoVecEqual(hits[j], end)) continue;
        let edge = geoChooseEdge(unmovedNodes, end, projection);
        _delta = geoVecSubtract(projection(edge.loc), start);
      }
    }
  }


  let action = function (graph) {
    if (_delta[0] === 0 && _delta[1] === 0) return graph;

    setupCache(graph);

    if (cache.intersections.length) {
      limitDelta(graph);
    }

    for (let i = 0; i < cache.nodes.length; i++) {
      let node = graph.entity(cache.nodes[i]);
      let start = projection(node.loc);
      let end = geoVecAdd(start, _delta);
      graph = graph.replace(node.move(projection.invert(end)));
    }

    if (cache.intersections.length) {
      graph = cleanupIntersections(graph);
    }

    return graph;
  };


  action.delta = function () {
    return _delta;
  };


  return action;
}
