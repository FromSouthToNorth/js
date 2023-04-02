import _debounce from 'lodash-es/debounce';
import {
  descending as d3_descending,
  ascending as d3_ascending,
} from 'd3-array';
import { select as d3_select } from 'd3-selection';

import { prefs } from '../../core/preferences';
import { t, localizer } from '../../core/localizer';
import { uiTooltip } from '../tooltip';
import { svgIcon } from '../../svg/icon';
import { uiCmd } from '../cmd';
import { uiSettingsCustomBackground } from '../settings/index.js';
import { uiSection } from '../section';
import { uiMapInMap } from '../map_in_map.js';

export function uiSectionBackgroundList(context) {

  let _backgroundList = d3_select(null);

  let _customSource = context.background()
    .findSource('custom');

  let _settingsCustomBackground = uiSettingsCustomBackground(context)
    .on('change', customChanged);

  let section = uiSection('background-list', context)
    .label(() => t.append('background.backgrounds'))
    .disclosureContent(renderDisclosureContent);

  function previousBackgroundID() {
    return prefs('background-last-used-toggle');
  }

  function renderDisclosureContent(selection) {

    // the background list
    let container = selection.selectAll('.layer-background-list')
      .data([0]);

    _backgroundList = container.enter()
      .append('ul')
      .attr('class', 'layer-list layer-background-list')
      .attr('dir', 'auto')
      .merge(container);

    // add minimap toggle below list
    const bgExtrasListEnter = selection.selectAll('.bg-extras-list')
      .data([0])
      .enter()
      .append('ul')
      .attr('class', 'layer-list bg-extras-list');

    const minimapLabelEnter = bgExtrasListEnter
      .append('li')
      .attr('class', 'minimap-toggle-item')
      .append('label')
      .call(uiTooltip()
        .title(() => t.append('background.minimap.tooltip'))
        .keys([t('background.minimap.key')])
        .placement('top'),
      );

    minimapLabelEnter
      .append('input')
      .attr('type', 'checkbox')
      .on('change', function(d3_event) {
        d3_event.preventDefault();
        uiMapInMap.toggle();
      });

    minimapLabelEnter
      .append('span')
      .call(t.append('background.minimap.description'));

    // "Info / Report a Problem" link
    selection.selectAll('.imagery-faq')
      .data([0])
      .enter()
      .append('div')
      .attr('class', 'imagery-faq')
      .append('a')
      .attr('target', '_blank')
      .call(svgIcon('#iD-icon-out-link', 'inline'))
      .attr('href',
        'https://github.com/openstreetmap/iD/blob/develop/FAQ.md#how-can-i-report-an-issue-with-background-imagery')
      .append('span')
      .call(t.append('background.imagery_problem_faq'));

    _backgroundList.call(drawListItems, 'radio', function(d3_event, d) {
      chooseBackground(d);
    }, function(d) {
      return !d.isHidden() && !d.overlay;
    });
  }

  function setTooltips(selection) {
    selection.each(function(d, i, nodes) {
      let item = d3_select(this)
        .select('label');
      let span = item.select('span');
      let placement = (i < nodes.length / 2) ? 'bottom' : 'top';
      let hasDescription = d.hasDescription();
      let isOverflowing = (span.property('clientWidth') !==
        span.property('scrollWidth'));

      item.call(uiTooltip().destroyAny);

      if (d.id === previousBackgroundID()) {
        item.call(uiTooltip()
          .placement(placement)
          .title(() => t.append('background.switch'))
          .keys([uiCmd('⌘' + t('background.key'))]),
        );
      }
      else if (hasDescription || isOverflowing) {
        item.call(uiTooltip()
          .placement(placement)
          .title(() => hasDescription ? d.description() : d.label()),
        );
      }
    });
  }

  function drawListItems(layerList, type, change, filter) {
    let sources = context.background()
      .sources(context.map()
        .extent(), context.map()
        .zoom(), true)
      .filter(filter)
      .sort(function(a, b) {
        return a.best() && !b.best() ? -1
          : b.best() && !a.best() ?
            1
            :
            d3_descending(a.area(), b.area()) ||
            d3_ascending(a.name(), b.name()) ||
            0;
      });

    let layerLinks = layerList.selectAll('li')
      // We have to be a bit inefficient about reordering the list since
      // arrow key navigation of radio values likes to work in the order
      // they were added, not the display document order.
      .data(sources, function(d, i) {
        return d.id + '---' + i;
      });

    layerLinks.exit()
      .remove();

    let enter = layerLinks.enter()
      .append('li')
      .classed('layer-custom', function(d) {
        return d.id === 'custom';
      })
      .classed('best', function(d) {
        return d.best();
      });

    let label = enter.append('label');

    label.append('input')
      .attr('type', type)
      .attr('name', 'background-layer')
      .attr('value', function(d) {
        return d.id;
      })
      .on('change', change);

    label.append('span')
      .each(function(d) {
        d.label()(d3_select(this));
      });

    enter.filter(function(d) {
      return d.id === 'custom';
    })
      .append('button')
      .attr('class', 'layer-browse')
      .call(uiTooltip()
        .title(() => t.append('settings.custom_background.tooltip'))
        .placement((localizer.textDirection() === 'rtl') ? 'right' : 'left'),
      )
      .on('click', function(d3_event) {
        d3_event.preventDefault();
        editCustom();
      })
      .call(svgIcon('#iD-icon-more'));

    enter.filter(function(d) {
      return d.best();
    })
      .append('div')
      .attr('class', 'best')
      .call(uiTooltip()
        .title(() => t.append('background.best_imagery'))
        .placement((localizer.textDirection() === 'rtl') ? 'right' : 'left'),
      )
      .append('span')
      .text('★');

    layerList.call(updateLayerSelections);
  }

  function updateLayerSelections(selection) {
    function active(d) {
      return context.background()
        .showsLayer(d);
    }

    selection.selectAll('li')
      .classed('active', active)
      .classed('switch', function(d) {
        return d.id === previousBackgroundID();
      })
      .call(setTooltips)
      .selectAll('input')
      .property('checked', active);
  }

  function chooseBackground(d) {
    if (d.id === 'custom' && !d.template()) {
      return editCustom();
    }

    let previousBackground = context.background()
      .baseLayerSource();
    prefs('background-last-used-toggle', previousBackground.id);
    prefs('background-last-used', d.id);
    context.background()
      .baseLayerSource(d);
  }

  function customChanged(d) {
    if (d && d.template) {
      _customSource.template(d.template);
      chooseBackground(_customSource);
    }
    else {
      _customSource.template('');
      chooseBackground(context.background()
        .findSource('none'));
    }
  }

  function editCustom() {
    context.container()
      .call(_settingsCustomBackground);
  }

  context.background()
    .on('change.background_list', function() {
      _backgroundList.call(updateLayerSelections);
    });

  context.map()
    .on('move.background_list',
      _debounce(function() {
        // layers in-view may have changed due to map move
        window.requestIdleCallback(section.reRender);
      }, 1000),
    );

  return section;
}
