import {
  select as d3_select
} from 'd3-selection';

import { t } from '../core/localizer';
import { dispatch as d3_dispatch } from 'd3-dispatch';
import { svgIcon } from '../svg/icon';
import { utilGetDimensions } from '../util/index.js';
import { utilRebind } from '../util';
import { services } from '../services';

export function uiPhotoviewer(context) {

  let dispatch = d3_dispatch('resize');

  let _pointerPrefix = 'PointerEvent' in window ? 'pointer' : 'mouse';

  function photoviewer(selection) {
    selection
    .append('button')
    .attr('class', 'thumb-hide')
    .attr('title', t('icons.close'))
    .on('click', function () {
      if (services.streetside) { services.streetside.hideViewer(context); }
      if (services.mapillary) { services.mapillary.hideViewer(context); }
      if (services.kartaview) { services.kartaview.hideViewer(context); }
    })
    .append('div')
    .call(svgIcon('#iD-icon-close'));

    function preventDefault(d3_event) {
      d3_event.preventDefault();
    }

    selection
    .append('button')
    .attr('class', 'resize-handle-xy')
    .on('touchstart touchdown touchend', preventDefault)
    .on(
      _pointerPrefix + 'down',
      buildResizeListener(selection, 'resize', dispatch, { resizeOnX: true, resizeOnY: true })
    );

    selection
    .append('button')
    .attr('class', 'resize-handle-x')
    .on('touchstart touchdown touchend', preventDefault)
    .on(
      _pointerPrefix + 'down',
      buildResizeListener(selection, 'resize', dispatch, { resizeOnX: true })
    );

    selection
    .append('button')
    .attr('class', 'resize-handle-y')
    .on('touchstart touchdown touchend', preventDefault)
    .on(
      _pointerPrefix + 'down',
      buildResizeListener(selection, 'resize', dispatch, { resizeOnY: true })
    );

    function buildResizeListener(target, eventName, dispatch, options) {

      let resizeOnX = !!options.resizeOnX;
      let resizeOnY = !!options.resizeOnY;
      let minHeight = options.minHeight || 240;
      let minWidth = options.minWidth || 320;
      let pointerId;
      let startX;
      let startY;
      let startWidth;
      let startHeight;

      function startResize(d3_event) {
        if (pointerId !== (d3_event.pointerId || 'mouse')) return;

        d3_event.preventDefault();
        d3_event.stopPropagation();

        let mapSize = context.map().dimensions();

        if (resizeOnX) {
          let maxWidth = mapSize[0];
          let newWidth = clamp((startWidth + d3_event.clientX - startX), minWidth, maxWidth);
          target.style('width', newWidth + 'px');
        }

        if (resizeOnY) {
          let maxHeight = mapSize[1] - 90;  // preserve space at top/bottom of map
          let newHeight = clamp((startHeight + startY - d3_event.clientY), minHeight, maxHeight);
          target.style('height', newHeight + 'px');
        }

        dispatch.call(eventName, target, utilGetDimensions(target, true));
      }

      function clamp(num, min, max) {
        return Math.max(min, Math.min(num, max));
      }

      function stopResize(d3_event) {
        if (pointerId !== (d3_event.pointerId || 'mouse')) return;

        d3_event.preventDefault();
        d3_event.stopPropagation();

        // remove all the listeners we added
        d3_select(window)
        .on('.' + eventName, null);
      }

      return function initResize(d3_event) {
        d3_event.preventDefault();
        d3_event.stopPropagation();

        pointerId = d3_event.pointerId || 'mouse';

        startX = d3_event.clientX;
        startY = d3_event.clientY;
        let targetRect = target.node().getBoundingClientRect();
        startWidth = targetRect.width;
        startHeight = targetRect.height;

        d3_select(window)
        .on(_pointerPrefix + 'move.' + eventName, startResize, false)
        .on(_pointerPrefix + 'up.' + eventName, stopResize, false);

        if (_pointerPrefix === 'pointer') {
          d3_select(window)
          .on('pointercancel.' + eventName, stopResize, false);
        }
      };
    }
  }

  photoviewer.onMapResize = function() {
    let photoviewer = context.container().select('.photoviewer');
    let content = context.container().select('.main-content');
    let mapDimensions = utilGetDimensions(content, true);
    // shrink photo viewer if it is too big
    // (-90 preserves space at top and bottom of map used by menus)
    let photoDimensions = utilGetDimensions(photoviewer, true);
    if (photoDimensions[0] > mapDimensions[0] || photoDimensions[1] > (mapDimensions[1] - 90)) {
      let setPhotoDimensions = [
        Math.min(photoDimensions[0], mapDimensions[0]),
        Math.min(photoDimensions[1], mapDimensions[1] - 90),
      ];

      photoviewer
      .style('width', setPhotoDimensions[0] + 'px')
      .style('height', setPhotoDimensions[1] + 'px');

      dispatch.call('resize', photoviewer, setPhotoDimensions);
    }
  };

  return utilRebind(photoviewer, dispatch, 'on');
}
