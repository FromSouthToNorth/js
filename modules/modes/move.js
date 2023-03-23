import {
  select as d3_select,
} from 'd3-selection';

import { t } from '../core/localizer';

import { actionMove } from '../actions/move';
import { actionNoop } from '../actions/noop';
import { behaviorEdit } from '../behavior/edit';
import { geoVecLength, geoVecSubtract } from '../geo/vector';
import { geoViewportEdge } from '../geo/geom';
import { modeBrowse } from './browse';
import { modeSelect } from './select';
import { utilKeybinding } from '../util';
import { utilFastMouse } from '../util/util';

// import { operationCircularize } from '../operations/circularize';
// import { operationDelete } from '../operations/delete';
// import { operationOrthogonalize } from '../operations/orthogonalize';
// import { operationReflectLong, operationReflectShort } from '../operations/reflect';
// import { operationRotate } from '../operations/rotate';

export function modeMove(context, entityIDs, baseGraph) {

}