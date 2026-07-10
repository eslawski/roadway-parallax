// postMessage protocol for driving the sim from a host page (e.g. an iframe
// parent). Incoming messages:
//   { type: 'roadway:setSpeed',    value: <mph> }
//   { type: 'roadway:setRoadType', value: 'mega' | 'highway' | 'backroad' }
//       (silently ignored while a scripted route is running)
//   { type: 'roadway:pause' } / { type: 'roadway:resume' } / { type: 'roadway:toggle' }
//   { type: 'roadway:pullOver' }   (terminal: park on the shoulder)
//   { type: 'roadway:getState' }
// Outgoing (to parent and to the sender of getState):
//   { type: 'roadway:state', state: {...} }
//   { type: 'roadway:transitionstart', from, to, distance }
//   { type: 'roadway:transitioncomplete', roadType }
//   { type: 'roadway:pullover' | 'roadway:parked' }
// Demo protocol, emitted alongside the legacy roadway:* messages above:
//   { type: 'ROADWAY_CHANGED', payload: { type } }  the moment the road
//       actually changes under the car (incl. once when a route starts)
//   { type: 'PARKED' }                              car fully parked
//   { type: 'ROUTE_ENDED', payload: { id, name } }  route length crossed
//   { type: '<scripted event name>', payload }      route events, verbatim
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
  // Spread first: transitioncomplete's payload has its own `type` key (the
  // road type), which must not clobber the message type.
  api.on('transitionstart', (e) => broadcast({ ...e, type: 'roadway:transitionstart' }));
  api.on('transitioncomplete', (e) => broadcast({ roadType: e.type, type: 'roadway:transitioncomplete' }));
  api.on('pullover', () => broadcast({ type: 'roadway:pullover' }));
  api.on('parked', () => broadcast({ type: 'roadway:parked' }));

  // Demo protocol (raw top-level types the host switches on directly).
  api.on('transitioncomplete', ({ type }) => broadcast({ type: 'ROADWAY_CHANGED', payload: { type } }));
  api.on('routeStarted', ({ type }) => broadcast({ type: 'ROADWAY_CHANGED', payload: { type } }));
  api.on('parked', () => broadcast({ type: 'PARKED' }));
  api.on('routeEvent', ({ event, payload }) => broadcast({ type: event, payload }));
  api.on('routeEnded', ({ id, name }) => broadcast({ type: 'ROUTE_ENDED', payload: { id, name } }));
}
