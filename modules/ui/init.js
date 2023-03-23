import { localizer } from '../core/localizer';
import { presetManager } from '../presets';
import { behaviorHash } from '../behavior';

export function uiInit(context) {

  function render(container) {

    const map = context.map();
    map.redrawEnable(false); // don't draw until we've set zoom/lat/long

    const content = container.append('div').
        attr('class', 'main-content active');

    content.append('div').
        attr('class', 'main-map').
        attr('dir', 'ltr').
        call(map);

    map.redrawEnable(true);

    ui.hash = behaviorHash(context);
    ui.hash();
    if (!ui.hash.hadLocation) {
      map.centerZoom([0, 0], 2);
    }
  }

  let ui = {};

  let _loadPromise;
  // renders the iD interface into the container node
  ui.ensureLoaded = () => {
    if (_loadPromise) return _loadPromise;
    return _loadPromise = Promise.all([
      localizer.ensureLoaded(),
      presetManager.ensureLoaded(),
    ]).then(() => {
      if (!context.container().empty()) {
        render(context.container());
      }
    }).catch(err => console.error(err)); // eslint-disable-line
  };

  return ui;

}
