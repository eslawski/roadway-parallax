// First-load welcome screen styled as an overhead interstate guide sign.
// Lists the keyboard controls, then "drives under" the sign on dismissal
// (any key or click) before handing input over to the running scene.

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

  .rw-rows {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 22px;
    row-gap: 13px;
    margin: 0;
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

  .rw-key--wide { padding: 0 16px; font-size: 12px; letter-spacing: 0.12em; }

  .rw-desc {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .rw-desc small {
    display: block;
    font-size: 12px;
    font-weight: 400;
    color: rgba(253, 254, 252, 0.6);
    letter-spacing: 0.05em;
  }

  .rw-footer {
    margin: 24px 0 0;
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

const MARKUP = /* html */ `
  <div class="rw-sign" role="dialog" aria-label="Keyboard controls">
    <h1 class="rw-title">Roadway Parallax</h1>
    <p class="rw-subtitle">Keyboard controls ahead</p>
    <hr class="rw-rule" />
    <div class="rw-rows">
      <span class="rw-keys"><kbd class="rw-key">&#8593;</kbd><kbd class="rw-key">&#8595;</kbd></span>
      <span class="rw-desc">Speed up / slow down <small>&plusmn;2.5 m/s per press</small></span>
      <span class="rw-keys"><kbd class="rw-key rw-key--wide">Space</kbd></span>
      <span class="rw-desc">Pause / resume</span>
      <span class="rw-keys"><kbd class="rw-key">1</kbd></span>
      <span class="rw-desc">Backroad <small>two-lane country road</small></span>
      <span class="rw-keys"><kbd class="rw-key">2</kbd></span>
      <span class="rw-desc">Highway <small>2 lanes, grass median</small></span>
      <span class="rw-keys"><kbd class="rw-key">3</kbd></span>
      <span class="rw-desc">Mega highway <small>4 lanes, concrete median</small></span>
    </div>
    <p class="rw-footer">Press any key to start</p>
  </div>
`;

export function showWelcomeOverlay() {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'rw-welcome';
  overlay.innerHTML = MARKUP;
  document.body.appendChild(overlay);

  const handle = { visible: true };
  function dismiss() {
    if (!handle.visible) return;
    handle.visible = false;
    window.removeEventListener('keydown', dismiss);
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

  window.addEventListener('keydown', dismiss);
  overlay.addEventListener('pointerdown', dismiss);
  return handle;
}
