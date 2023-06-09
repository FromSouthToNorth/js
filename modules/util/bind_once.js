export function utilBindOnce(target, type, listener, capture) {
  const typeOnce = type + '.once';

  function one() {
    target.on(typeOnce, null);
    listener.apply(this, arguments);
  }

  target.on(typeOnce, one, capture);
  return this;
}
