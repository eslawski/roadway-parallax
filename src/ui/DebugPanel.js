// Subtle route-mode HUD: live distance, current roadway, next marker, and a
// log of everything the route has fired (scripted events, roadway changes,
// route end, parked). Visible by default; the D key toggles it.

const STYLES = /* css */ `
  .rw-debug {
    position: fixed;
    top: 14px;
    right: 14px;
    z-index: 9;
    width: 250px;
    padding: 12px 14px;
    box-sizing: border-box;
    background: rgba(10, 18, 14, 0.72);
    border: 1px solid rgba(244, 246, 242, 0.22);
    border-radius: 10px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    color: #e8ede8;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 11px;
    line-height: 1.5;
  }

  .rw-debug.rw-debug--hidden { display: none; }

  .rw-debug-title {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(232, 237, 232, 0.65);
  }

  .rw-debug-row { display: flex; justify-content: space-between; gap: 10px; }
  .rw-debug-row b { font-weight: 600; color: #fff; text-align: right; }

  .rw-debug-log {
    margin: 8px 0 0;
    padding: 6px 0 0;
    border-top: 1px solid rgba(244, 246, 242, 0.18);
    max-height: 180px;
    overflow-y: auto;
  }

  .rw-debug-log:empty::before {
    content: 'no events yet';
    color: rgba(232, 237, 232, 0.4);
  }

  .rw-debug-entry { color: rgba(232, 237, 232, 0.9); }
  .rw-debug-entry .rw-debug-at { color: rgba(232, 237, 232, 0.45); }
  .rw-debug-entry .rw-debug-payload {
    display: block;
    padding-left: 10px;
    color: rgba(232, 237, 232, 0.55);
    word-break: break-all;
  }
`;

const LOG_LIMIT = 8;
const REFRESH_MS = 100;

export class DebugPanel {
  constructor(api, runner) {
    this.api = api;
    this.runner = runner;
    this.lastRefresh = 0;

    this.style = document.createElement('style');
    this.style.textContent = STYLES;
    document.head.appendChild(this.style);

    this.el = document.createElement('div');
    this.el.className = 'rw-debug';
    this.el.innerHTML = /* html */ `
      <p class="rw-debug-title">${runner.route.name}</p>
      <div class="rw-debug-row"><span>distance</span><b data-f="distance">0.000 mi</b></div>
      <div class="rw-debug-row"><span>roadway</span><b data-f="roadway"></b></div>
      <div class="rw-debug-row"><span>next</span><b data-f="next"></b></div>
      <div class="rw-debug-log" data-f="log"></div>
    `;
    document.body.appendChild(this.el);
    this.fields = {};
    for (const el of this.el.querySelectorAll('[data-f]')) this.fields[el.dataset.f] = el;

    // The runner emitted routeStarted before we existed; seed the log with it.
    this.log('ROADWAY_CHANGED', { type: runner.route.profile[0].type }, 0);
    api.on('routeEvent', ({ event, payload, atMiles }) => this.log(event, payload, atMiles));
    api.on('transitioncomplete', ({ type }) =>
      this.log('ROADWAY_CHANGED', { type }, runner.distanceMiles)
    );
    api.on('routeEnded', () => this.log('ROUTE_ENDED', undefined, runner.distanceMiles));
    api.on('parked', () => this.log('PARKED', undefined, runner.distanceMiles));
  }

  toggle() {
    this.el.classList.toggle('rw-debug--hidden');
  }

  log(name, payload, atMiles) {
    const entry = document.createElement('div');
    entry.className = 'rw-debug-entry';
    const payloadHtml =
      payload !== undefined
        ? `<span class="rw-debug-payload">${JSON.stringify(payload)}</span>`
        : '';
    entry.innerHTML = `<span class="rw-debug-at">${atMiles.toFixed(3)}</span> ${name}${payloadHtml}`;
    this.fields.log.prepend(entry);
    while (this.fields.log.childElementCount > LOG_LIMIT) this.fields.log.lastElementChild.remove();
  }

  update(now) {
    if (now - this.lastRefresh < REFRESH_MS) return;
    this.lastRefresh = now;
    this.fields.distance.textContent = `${this.runner.distanceMiles.toFixed(3)} mi`;
    this.fields.roadway.textContent = this.api.getRoadType();
    const next = this.runner.nextMarker();
    this.fields.next.textContent = next
      ? `${next.label} in ${Math.max(0, next.atMiles - this.runner.distanceMiles).toFixed(2)} mi`
      : '—';
  }
}
