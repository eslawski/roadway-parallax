// Up/Down arrows: speed +/- 2.5 m/s. Space: pause/resume. 1/2/3: road types.
export function initKeyboard(api) {
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'ArrowUp':
        api.setSpeed(api.getState().targetSpeed + 2.5);
        e.preventDefault();
        break;
      case 'ArrowDown':
        api.setSpeed(api.getState().targetSpeed - 2.5);
        e.preventDefault();
        break;
      case 'Space':
        api.toggle();
        e.preventDefault();
        break;
      case 'Digit1':
        api.setRoadType('mega');
        break;
      case 'Digit2':
        api.setRoadType('highway');
        break;
      case 'Digit3':
        api.setRoadType('backroad');
        break;
    }
  });
}
