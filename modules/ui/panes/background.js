import { t } from '../../core/localizer';
import { uiPane } from '../pane';

import {
  uiSectionBackgroundList,
  uiSectionBackgroundOffset,
  uiSectionOverlayList,
  uiSectionBackgroundDisplayOptions,
} from '../sections/index.js';

export function uiPaneBackground(context) {

  return uiPane('background', context)
    .key(t('background.key'))
    .label(t.append('background.title'))
    .description(t.append('background.description'))
    .iconName('iD-icon-layers')
    .sections([
      uiSectionBackgroundList(context),
      uiSectionOverlayList(context),
      uiSectionBackgroundDisplayOptions(context),
      uiSectionBackgroundOffset(context),
    ]);
}
