export function behaviorEdit(context) {

  function behavior() {
    context.map().minZoom(context.minEditableZoom());
  }

  behavior.off = function() {
    context.map().minZoom(0);
  };

  return behavior;
}
