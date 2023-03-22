import { select as d3_select } from 'd3-selection';

import { t } from '../core/localizer';

import { actionAddMidpoint } from '../actions/index.js';
import { actionDeleteRelation } from '../actions/index.js';
import { actionMove } from '../actions/move';
import { actionScale } from '../actions/scale';

import { behaviorBreathe } from '../behavior/breathe';
import { behaviorHover } from '../behavior/hover';
import { behaviorLasso } from '../behavior/lasso';
import { behaviorPaste } from '../behavior/paste';
import { behaviorSelect } from '../behavior/select';

import { operationMove } from '../operations/move';

import { geoExtent, geoChooseEdge, geoMetersToLat, geoMetersToLon } from '../geo';
import { modeBrowse } from './browse';
// import { modeDragNode } from './drag_node';
// import { modeDragNote } from './drag_note';
import { osmNode, osmWay } from '../osm';
import * as Operations from '../operations/index';
import { uiCmd } from '../ui/cmd';
import {
  utilArrayIntersection, utilArrayUnion, utilDeepMemberSelector, utilEntityOrDeepMemberSelector,
  utilEntitySelector, utilKeybinding, utilTotalExtent, utilGetAllNodes,
} from '../util';

export function modeSelect(context, selectedIDs) {

}
