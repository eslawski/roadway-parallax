// First-load welcome screen styled as an overhead interstate guide sign.
// Doubles as the route picker: the sim will not start until the user clicks a
// scripted route or Free drive. On selection the sign "drives under" and away,
// exactly like the old any-key dismissal.

const STYLES = /* css */ `
  .rw-welcome {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(ellipse at 50% 120%, rgba(20, 34, 28, 0.15), transparent 60%),
      rgba(16, 28, 38, 0.42);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    perspective: 900px;
    perspective-origin: 50% 100%;
    font-family: 'Overpass', 'Trebuchet MS', sans-serif;
    transition: opacity 0.55s ease 0.15s;
  }

  .rw-sign {
    position: relative;
    background:
      linear-gradient(168deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 38%),
      #01703b;
    border: 4px solid #f4f6f2;
    border-radius: 18px;
    box-shadow:
      inset 0 0 0 2px #01703b,
      inset 0 0 0 4px rgba(244, 246, 242, 0.55),
      0 30px 60px -18px rgba(8, 20, 14, 0.55);
    padding: 34px 46px 26px;
    min-width: min(430px, 86vw);
    max-width: 92vw;
    color: #fdfefc;
    transform-origin: 50% 0%;
    animation: rw-approach 0.9s cubic-bezier(0.16, 0.9, 0.3, 1) both;
  }

  @keyframes rw-approach {
    from { transform: translateY(-6vh) scale(0.32); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }

  /* Dismissal: the sign sweeps up and overhead as if driven under. */
  .rw-welcome.rw-departing { opacity: 0; pointer-events: none; }
  .rw-welcome.rw-departing .rw-sign {
    animation: rw-drive-under 0.7s cubic-bezier(0.5, 0, 0.9, 0.4) both;
  }

  @keyframes rw-drive-under {
    to { transform: translateY(-130vh) scale(2.6) rotateX(58deg); opacity: 0.4; }
  }

  .rw-title {
    margin: 0;
    font-size: clamp(30px, 5.4vw, 40px);
    font-weight: 900;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    line-height: 1;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
  }

  .rw-subtitle {
    margin: 6px 0 0;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(253, 254, 252, 0.72);
  }

  .rw-rule {
    border: none;
    border-top: 2px solid rgba(244, 246, 242, 0.85);
    margin: 18px 0 20px;
  }

  .rw-routes {
    display: grid;
    row-gap: 10px;
    margin: 0 0 4px;
  }

  .rw-route {
    display: block;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.07);
    border: 2px solid rgba(244, 246, 242, 0.55);
    border-radius: 11px;
    color: inherit;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  }

  .rw-route:hover, .rw-route:focus-visible {
    background: rgba(255, 255, 255, 0.16);
    border-color: #f4f6f2;
    transform: translateX(2px);
    outline: none;
  }

  .rw-route-name {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .rw-route-name small {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    font-weight: 400;
    color: rgba(253, 254, 252, 0.6);
    letter-spacing: 0.05em;
  }

  .rw-route-name small .rw-key {
    margin: 0 1px;
    vertical-align: -1px;
  }

  .rw-keys {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .rw-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    height: 34px;
    padding: 0 10px;
    box-sizing: border-box;
    background: linear-gradient(180deg, #ffffff 0%, #dde3dc 100%);
    border-radius: 7px;
    border: 1px solid #9fae9f;
    box-shadow: 0 3px 0 #8a9a8a, 0 4px 6px rgba(8, 20, 14, 0.35);
    color: #1c3327;
    font-family: inherit;
    font-size: 15px;
    font-weight: 800;
    line-height: 1;
  }

  .rw-key--small {
    min-width: 26px;
    height: 26px;
    font-size: 12px;
    border-radius: 6px;
    box-shadow: 0 2px 0 #8a9a8a, 0 3px 5px rgba(8, 20, 14, 0.35);
  }

  .rw-key--inline {
    min-width: 21px;
    height: 21px;
    padding: 0 5px;
    font-size: 11px;
    font-weight: 700;
    border-radius: 5px;
    box-shadow: 0 2px 0 #8a9a8a, 0 2px 4px rgba(8, 20, 14, 0.35);
  }

  .rw-controls {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 14px;
    row-gap: 8px;
    margin: 16px 0 0;
  }

  .rw-desc {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .rw-desc small {
    font-size: 11px;
    font-weight: 400;
    color: rgba(253, 254, 252, 0.6);
    letter-spacing: 0.05em;
  }

  .rw-footer {
    margin: 20px 0 0;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: rgba(253, 254, 252, 0.85);
    animation: rw-pulse 1.6s ease-in-out infinite;
  }

  @keyframes rw-pulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .rw-sign, .rw-welcome.rw-departing .rw-sign { animation: none; }
    .rw-footer { animation: none; }
  }
`;

const CONTROLS = /* html */ `
  <hr class="rw-rule" />
  <div class="rw-controls">
    <span class="rw-keys"><kbd class="rw-key rw-key--small">&#8593;</kbd><kbd class="rw-key rw-key--small">&#8595;</kbd></span>
    <span class="rw-desc">Speed up / slow down <small>&plusmn;5 mph</small></span>
    <span class="rw-keys"><kbd class="rw-key rw-key--small">Space</kbd></span>
    <span class="rw-desc">Pause / resume</span>
    <span class="rw-keys"><kbd class="rw-key rw-key--small">P</kbd></span>
    <span class="rw-desc">Pull over &amp; park <small>refresh to drive again</small></span>
    <span class="rw-keys"><kbd class="rw-key rw-key--small">D</kbd></span>
    <span class="rw-desc">Toggle route info panel <small>routes only</small></span>
  </div>
`;

// Shows the picker. `routes` is the array from routes.js; `onSelect` is
// called synchronously with the chosen route (or null for Free drive) BEFORE
// the dismissal animation starts, so world changes it makes (segment rebuild,
// speed) are masked by the overlay.
export function showWelcomeOverlay(routes, onSelect) {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);

  const routeRows = routes
    .map(
      (r, i) => /* html */ `
        <button class="rw-route" data-index="${i}">
          <span class="rw-route-name">${r.name}<small>${r.length.toFixed(1)} mi scripted route</small></span>
        </button>`
    )
    .join('');

  const overlay = document.createElement('div');
  overlay.className = 'rw-welcome';
  overlay.innerHTML = /* html */ `
    <div class="rw-sign" role="dialog" aria-label="Choose a route">
      <h1 class="rw-title">Roadway Parallax</h1>
      <p class="rw-subtitle">Choose your route</p>
      <hr class="rw-rule" />
      <div class="rw-routes">
        ${routeRows}
        <button class="rw-route" data-index="free">
          <span class="rw-route-name">Free drive<small>Change the roadway at will with
            <kbd class="rw-key rw-key--inline">1</kbd><kbd class="rw-key rw-key--inline">2</kbd><kbd class="rw-key rw-key--inline">3</kbd></small></span>
        </button>
      </div>
      ${CONTROLS}
      <p class="rw-footer">Select to start driving</p>
    </div>
  `;
  document.body.appendChild(overlay);

  const handle = { visible: true };

  function choose(index) {
    if (!handle.visible) return;
    handle.visible = false;
    onSelect(index === 'free' ? null : routes[index]);

    overlay.classList.add('rw-departing');
    // transitionend can be dropped (hidden/throttled tab), so also clean up
    // on a timer slightly past the 0.7s exit transition.
    function cleanup() {
      overlay.remove();
      style.remove();
    }
    overlay.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 900);
  }

  for (const btn of overlay.querySelectorAll('.rw-route')) {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.index;
      choose(idx === 'free' ? 'free' : Number(idx));
    });
  }
  return handle;
}
