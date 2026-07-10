// Up/Down arrows: speed +/- 5 mph. Space: pause/resume. 1/2/3: road types
// (silently ignored while a scripted route is running — see RoadwayAPI).
// P: pull over to the shoulder and park (terminal), via extras.onPullOver.
// D: toggle the route debug panel, via extras.onDebugToggle.
// B (unlisted): bigfoot easter egg, via extras.onBigfoot.
// extras.isActive gates everything (false while the route picker is up, which
// needs the number keys and F for selection).
export function initKeyboard(api, extras = {}) {
  window.addEventListener('keydown', (e) => {
    if (extras.isActive && !extras.isActive()) return;
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
      case 'KeyD':
        extras.onDebugToggle?.();
        break;
      case 'KeyB':
        extras.onBigfoot?.();
        break;
    }
  });
}
