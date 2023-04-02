import {
  select as d3_select,
} from 'd3-selection';

import { t, localizer } from '../../core/index.js';
import { geoMetersToOffset, geoOffsetToMeters } from '../../geo/index.js';
import { svgIcon } from '../../svg/index.js';
import { uiSection } from '../section.js';

export function uiSectionBackgroundOffset(context) {

  let section = uiSection('background-offset', context)
    .label(() => t.append('background.fix_misalignment'))
    .disclosureContent(renderDisclosureContent)
    .expandedByDefault(false);

  let _pointerPrefix = 'PointerEvent' in window ? 'pointer' : 'mouse';

  let _directions = [
    ['top', [0, -0.5]],
    ['left', [-0.5, 0]],
    ['right', [0.5, 0]],
    ['bottom', [0, 0.5]],
  ];


  function updateValue() {
    let meters = geoOffsetToMeters(context.background()
      .offset());
    let x = +meters[0].toFixed(2);
    let y = +meters[1].toFixed(2);

    context.container()
      .selectAll('.nudge-inner-rect')
      .select('input')
      .classed('error', false)
      .property('value', x + ', ' + y);

    context.container()
      .selectAll('.nudge-reset')
      .classed('disabled', function() {
        return (x === 0 && y === 0);
      });
  }


  function resetOffset() {
    context.background()
      .offset([0, 0]);
    updateValue();
  }


  function nudge(d) {
    context.background()
      .nudge(d, context.map()
        .zoom());
    updateValue();
  }


  function inputOffset() {
    let input = d3_select(this);
    let d = input.node().value;

    if (d === '') return resetOffset();

    d = d.replace(/;/g, ',')
      .split(',')
      .map(function(n) {
        // if n is NaN, it will always get mapped to false.
        return !isNaN(n) && n;
      });

    if (d.length !== 2 || !d[0] || !d[1]) {
      input.classed('error', true);
      return;
    }

    context.background()
      .offset(geoMetersToOffset(d));
    updateValue();
  }


  function dragOffset(d3_event) {
    if (d3_event.button !== 0) return;

    let origin = [d3_event.clientX, d3_event.clientY];

    let pointerId = d3_event.pointerId || 'mouse';

    context.container()
      .append('div')
      .attr('class', 'nudge-surface');

    d3_select(window)
      .on(_pointerPrefix + 'move.drag-bg-offset', pointermove)
      .on(_pointerPrefix + 'up.drag-bg-offset', pointerup);

    if (_pointerPrefix === 'pointer') {
      d3_select(window)
        .on('pointercancel.drag-bg-offset', pointerup);
    }

    function pointermove(d3_event) {
      if (pointerId !== (d3_event.pointerId || 'mouse')) return;

      let latest = [d3_event.clientX, d3_event.clientY];
      let d = [
        -(origin[0] - latest[0]) / 4,
        -(origin[1] - latest[1]) / 4,
      ];

      origin = latest;
      nudge(d);
    }

    function pointerup(d3_event) {
      if (pointerId !== (d3_event.pointerId || 'mouse')) return;
      if (d3_event.button !== 0) return;

      context.container()
        .selectAll('.nudge-surface')
        .remove();

      d3_select(window)
        .on('.drag-bg-offset', null);
    }
  }


  function renderDisclosureContent(selection) {
    let container = selection.selectAll('.nudge-container')
      .data([0]);

    let containerEnter = container.enter()
      .append('div')
      .attr('class', 'nudge-container');

    containerEnter
      .append('div')
      .attr('class', 'nudge-instructions')
      .call(t.append('background.offset'));

    let nudgeWrapEnter = containerEnter
      .append('div')
      .attr('class', 'nudge-controls-wrap');

    let nudgeEnter = nudgeWrapEnter
      .append('div')
      .attr('class', 'nudge-outer-rect')
      .on(_pointerPrefix + 'down', dragOffset);

    nudgeEnter
      .append('div')
      .attr('class', 'nudge-inner-rect')
      .append('input')
      .attr('type', 'text')
      .attr('aria-label', t('background.offset_label'))
      .on('change', inputOffset);

    nudgeWrapEnter
      .append('div')
      .selectAll('button')
      .data(_directions)
      .enter()
      .append('button')
      .attr('title', function(d) {
        return t(`background.nudge.${d[0]}`);
      })
      .attr('class', function(d) {
        return d[0] + ' nudge';
      })
      .on('click', function(d3_event, d) {
        nudge(d[1]);
      });

    nudgeWrapEnter
      .append('button')
      .attr('title', t('background.reset'))
      .attr('class', 'nudge-reset disabled')
      .on('click', function(d3_event) {
        d3_event.preventDefault();
        resetOffset();
      })
      .call(svgIcon('#iD-icon-' + (localizer.textDirection() === 'rtl' ? 'redo' : 'undo')));

    updateValue();
  }

  context.background()
    .on('change.backgroundOffset-update', updateValue);

  return section;
}