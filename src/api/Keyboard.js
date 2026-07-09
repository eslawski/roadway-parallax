// Up/Down arrows: speed +/- 5 mph. Space: pause/resume. 1/2/3: road types.
// P: pull over to the shoulder and park (terminal), via extras.onPullOver.
// B (unlisted): bigfoot easter egg, via extras.onBigfoot.
export function initKeyboard(api, extras = {}) {
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'ArrowUp':
        api.setSpeed(api.getState().targetSpeed + 5);
        e.preventDefault();
        break;
      case 'ArrowDown':
        api.setSpeed(api.getState().targetSpeed - 5);
        e.preventDefault();
        break;
      case 'Space':
        api.toggle();
        e.preventDefault();
        break;
      case 'Digit1':
        api.setRoadType('backroad');
        break;
      case 'Digit2':
        api.setRoadType('highway');
        break;
      case 'Digit3':
        api.setRoadType('mega');
        break;
      case 'KeyP':
        extras.onPullOver?.();
        break;
      case 'KeyB':
        extras.onBigfoot?.();
        break;
    }
  });
}
