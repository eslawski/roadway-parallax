// Unmistakable end-of-route marker: a small overhead guide sign (same visual
// language as the welcome sign) drops in and stays. Driving continues behind
// it on the route's final roadway type.

const STYLES = /* css */ `
  .rw-end {
    position: fixed;
    top: 22px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9;
    background:
      linear-gradient(168deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 38%),
      #01703b;
    border: 3px solid #f4f6f2;
    border-radius: 13px;
    box-shadow:
      inset 0 0 0 2px #01703b,
      inset 0 0 0 3px rgba(244, 246, 242, 0.55),
      0 18px 40px -14px rgba(8, 20, 14, 0.6);
    padding: 14px 30px 12px;
    color: #fdfefc;
    font-family: 'Overpass', 'Trebuchet MS', sans-serif;
    text-align: center;
    animation: rw-end-drop 0.8s cubic-bezier(0.16, 0.9, 0.3, 1) both;
  }

  @keyframes rw-end-drop {
    from { transform: translateX(-50%) translateY(-16vh) scale(0.5); opacity: 0; }
    to   { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
  }

  .rw-end-title {
    margin: 0;
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    line-height: 1.1;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
  }

  .rw-end-route {
    margin: 2px 0 0;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(253, 254, 252, 0.72);
  }

  @media (prefers-reduced-motion: reduce) {
    .rw-end { animation: none; }
  }
`;

export function showEndSign(routeName) {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);

  const sign = document.createElement('div');
  sign.className = 'rw-end';
  sign.innerHTML = /* html */ `
    <p class="rw-end-title">End</p>
    <p class="rw-end-route">${routeName}</p>
  `;
  document.body.appendChild(sign);
}
