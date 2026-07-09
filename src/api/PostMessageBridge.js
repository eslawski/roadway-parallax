// postMessage protocol for driving the sim from a host page (e.g. an iframe
// parent). Incoming messages:
//   { type: 'roadway:setSpeed',    value: <mph> }
//   { type: 'roadway:setRoadType', value: 'mega' | 'highway' | 'backroad' }
//   { type: 'roadway:pause' } / { type: 'roadway:resume' } / { type: 'roadway:toggle' }
//   { type: 'roadway:pullOver' }   (terminal: park on the shoulder)
//   { type: 'roadway:getState' }
// Outgoing (to parent and to the sender of getState):
//   { type: 'roadway:state', state: {...} }
//   { type: 'roadway:transitionstart' | 'roadway:transitioncomplete', ... }
//   { type: 'roadway:pullover' | 'roadway:parked' }
export function initPostMessageBridge(api) {
  const post = (target, msg) => {
    try {
      target.postMessage(msg, '*');
    } catch {
      /* host gone */
    }
  };
  const broadcast = (msg) => {
    if (window.parent && window.parent !== window) post(window.parent, msg);
  };

  window.addEventListener('message', (e) => {
    const { type, value } = e.data ?? {};
    if (typeof type !== 'string' || !type.startsWith('roadway:')) return;
    switch (type) {
      case 'roadway:setSpeed':
        api.setSpeed(value);
        break;
      case 'roadway:setRoadType':
        api.setRoadType(value);
        break;
      case 'roadway:pause':
        api.pause();
        break;
      case 'roadway:resume':
        api.resume();
        break;
      case 'roadway:toggle':
        api.toggle();
        break;
      case 'roadway:pullOver':
        api.pullOver();
        break;
      case 'roadway:getState':
        post(e.source ?? window.parent, { type: 'roadway:state', state: api.getState() });
        break;
    }
  });

  api.on('statechange', (state) => broadcast({ type: 'roadway:state', state }));
  api.on('transitionstart', (e) => broadcast({ type: 'roadway:transitionstart', ...e }));
  api.on('transitioncomplete', (e) => broadcast({ type: 'roadway:transitioncomplete', ...e }));
  api.on('pullover', () => broadcast({ type: 'roadway:pullover' }));
  api.on('parked', () => broadcast({ type: 'roadway:parked' }));
}
