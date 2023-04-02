import { utilFunctor } from '../util/index.js';
import { t } from '../core';
import { uiPopover } from './popover.js';

export function uiTooltip(klass) {

  let tooltip = uiPopover((klass || '') + ' tooltip')
    .displayType('hover');

  let _title = function() {
    let title = this.getAttribute('data-original-title');
    if (title) {
      return title;
    }
    else {
      title = this.getAttribute('title');
      this.removeAttribute('title');
      this.setAttribute('data-original-title', title);
    }
    return title;
  };

  let _heading = utilFunctor(null);
  let _keys = utilFunctor(null);

  tooltip.title = function(val) {
    if (!arguments.length) return _title;
    _title = utilFunctor(val);
    return tooltip;
  };

  tooltip.heading = function(val) {
    if (!arguments.length) return _heading;
    _heading = utilFunctor(val);
    return tooltip;
  };

  tooltip.keys = function(val) {
    if (!arguments.length) return _keys;
    _keys = utilFunctor(val);
    return tooltip;
  };

  tooltip.content(function() {
    let heading = _heading.apply(this, arguments);
    let text = _title.apply(this, arguments);
    let keys = _keys.apply(this, arguments);

    let headingCallback = typeof heading === 'function' ?
      heading :
      s => s.text(heading);
    let textCallback = typeof text === 'function' ? text : s => s.text(text);

    return function(selection) {

      let headingSelect = selection.selectAll('.tooltip-heading')
        .data(heading ? [heading] : []);

      headingSelect.exit()
        .remove();

      headingSelect.enter()
        .append('div')
        .attr('class', 'tooltip-heading')
        .merge(headingSelect)
        .text('')
        .call(headingCallback);

      let textSelect = selection.selectAll('.tooltip-text')
        .data(text ? [text] : []);

      textSelect.exit()
        .remove();

      textSelect.enter()
        .append('div')
        .attr('class', 'tooltip-text')
        .merge(textSelect)
        .text('')
        .call(textCallback);

      let keyhintWrap = selection.selectAll('.keyhint-wrap')
        .data(keys && keys.length ? [0] : []);

      keyhintWrap.exit()
        .remove();

      let keyhintWrapEnter = keyhintWrap.enter()
        .append('div')
        .attr('class', 'keyhint-wrap');

      keyhintWrapEnter.append('span')
        .call(t.append('tooltip_keyhint'));

      keyhintWrap = keyhintWrapEnter.merge(keyhintWrap);

      keyhintWrap.selectAll('kbd.shortcut')
        .data(keys && keys.length ? keys : [])
        .enter()
        .append('kbd')
        .attr('class', 'shortcut')
        .text(function(d) {
          return d;
        });
    };
  });

  return tooltip;
}