// 구름 & 물방울 애니메이션
const sky = document.getElementById('simSky');

function makeCloudSVG(w, h) {
  const cx = w / 2, base = h * 0.68;
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="${cx}" cy="${base}" rx="${w*0.44}" ry="${h*0.22}" fill="#c2dff5"/>
    <circle cx="${w*0.25}" cy="${base-h*0.18}" r="${w*0.18}" fill="#d4ecfc"/>
    <circle cx="${w*0.50}" cy="${base-h*0.28}" r="${w*0.22}" fill="#dff2ff"/>
    <circle cx="${w*0.74}" cy="${base-h*0.16}" r="${w*0.17}" fill="#d4ecfc"/>
    <circle cx="${w*0.38}" cy="${base-h*0.22}" r="${w*0.15}" fill="#dcf0ff"/>
    <circle cx="${w*0.63}" cy="${base-h*0.23}" r="${w*0.15}" fill="#dcf0ff"/>
    <ellipse cx="${w*0.42}" cy="${base-h*0.30}" rx="${w*0.10}" ry="${h*0.07}" fill="white" opacity="0.45"/>
  </svg>`;
}

function makeDropletSVG() {
  return `<svg viewBox="0 0 52 64" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="dg" cx="38%" cy="32%" r="60%">
        <stop offset="0%"   stop-color="#e8f6ff"/>
        <stop offset="60%"  stop-color="#7bbde0"/>
        <stop offset="100%" stop-color="#4a8fbc"/>
      </radialGradient>
    </defs>
    <path d="M26 3 C26 3, 6 26, 6 41 a20 20 0 0 0 40 0 C46 26, 26 3, 26 3Z"
          fill="url(#dg)" stroke="#5a9fcc" stroke-width="1.5"/>
    <ellipse cx="18" cy="30" rx="5" ry="7.5" fill="white" opacity="0.4" transform="rotate(-20,18,30)"/>
  </svg>`;
}

function createCloud(name) {
  const w = 200 + Math.random() * 60;
  const h = 130 + Math.random() * 30;

  const skyH      = sky.offsetHeight;
  const sproutTop = skyH * (1 - 0.03) - 45;
  const maxTop    = Math.max(0, sproutTop - h);
  const topPx     = Math.random() * maxTop;
  const leftPct   = Math.random() * 78;

  const cloud = document.createElement('div');
  cloud.className = 'cloud';
  cloud.id = `cloud-${name}`;
  cloud.style.cssText = `top:${topPx}px;left:${leftPct}%;width:${w}px;height:${h}px;`;

  const body = document.createElement('div');
  body.className = 'cloud-body';
  body.innerHTML = makeCloudSVG(w, h);
  cloud.appendChild(body);

  const drop = document.createElement('div');
  drop.className = 'droplet';
  drop.innerHTML = `${makeDropletSVG()}<span>${name}</span>`;
  cloud.appendChild(drop);

  sky.appendChild(cloud);
}

function removeCloud(name) {
  const el = document.getElementById(`cloud-${name}`);
  if (!el) return;
  el.style.transition = 'opacity 0.3s, transform 0.3s';
  el.style.opacity = '0';
  el.style.transform = 'scale(0.8)';
  setTimeout(() => el.remove(), 300);
}





// 물방울 낙하 애니메이션
function dropFromCloud(name) {
  const cloud = document.getElementById(`cloud-${name}`);
  if (!cloud) return;
  const droplet = cloud.querySelector('.droplet');
  if (!droplet) return;

  const skyRect  = sky.getBoundingClientRect();
  const dropRect = droplet.getBoundingClientRect();

  droplet.style.opacity = '0';

  const clone = document.createElement('div');
  clone.className = 'falling-drop';
  clone.innerHTML = droplet.innerHTML;
  clone.style.left = `${dropRect.left - skyRect.left}px`;
  clone.style.top  = `${dropRect.top  - skyRect.top}px`;
  sky.appendChild(clone);

  const groundEl  = document.getElementById('ground');
  const groundTop = groundEl
    ? groundEl.getBoundingClientRect().top - skyRect.top
    : sky.offsetHeight - 40;
  const dropH    = dropRect.height || 64;
  const fallDist = Math.max(10, groundTop - (dropRect.top - skyRect.top) - dropH);

  clone.style.setProperty('--fall-dist', fallDist + 'px');

  setTimeout(() => {
    const bx = dropRect.left - skyRect.left + dropRect.width / 2;
    triggerBurst(bx, groundTop, name);
  }, 1100);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    clone.classList.add('animate-fall');
  }));

  setTimeout(() => clone.remove(), 1600);
}

function stopDropAnimation() {
  dropTimers.forEach(t => clearTimeout(t));
  dropTimers = [];
  processes.forEach(p => {
    const cloud = document.getElementById(`cloud-${p.name}`);
    if (!cloud) return;
    const droplet = cloud.querySelector('.droplet');
    if (droplet) droplet.style.opacity = '1';
  });
}

function startDropAnimation() {
  if (processes.length === 0) {
    running = false;
    const btn = document.getElementById('startBtn');
    btn.textContent = '시작';
    btn.classList.remove('running');
    return;
  }
  // 실제 도착 시간 기반 드롭은 startGanttTimer가 처리.
  // 여기서는 AT=0 프로세스의 시각적 표시만 담당 (addToReadyQueue는 startGanttTimer에서 호출).
}




// Context Switching, 번개 효과
function incrementContextSwitch() {
  contextSwitchCount++;
  const el = document.getElementById('pwVal-ctx');
  if (el) el.textContent = contextSwitchCount + '회';
  const badge = document.getElementById('ctxBadge');
  if (badge) {
    badge.classList.remove('ctx-badge--bump');
    void badge.offsetWidth;
    badge.classList.add('ctx-badge--bump');
  }
  triggerLightning();
}

function makeLightningSVG(seed) {
  const w = 44, h = 130, mid = w / 2;
  const zig = (seed % 3 === 0)
    ? `${mid},0 ${mid-14},45 ${mid+6},45 ${mid-18},130 ${mid+20},55 ${mid+2},55 ${mid+16},0`
    : (seed % 3 === 1)
    ? `${mid},0 ${mid-10},40 ${mid+8},40 ${mid-16},130 ${mid+22},50 ${mid+4},50 ${mid+12},0`
    : `${mid},0 ${mid-16},50 ${mid+4},50 ${mid-12},130 ${mid+18},60 ${mid},60 ${mid+14},0`;

  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow-${seed}">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <polyline points="${zig}" fill="#ffe566" stroke="#ffffff" stroke-width="5"
              stroke-linejoin="round" opacity="0.35" filter="url(#glow-${seed})"/>
    <polyline points="${zig}" fill="#ffe566" stroke="#fff8c0" stroke-width="1.5"
              stroke-linejoin="round"/>
  </svg>`;
}

function triggerLightning() {
  const skyEl = document.getElementById('simSky');
  if (!skyEl) return;
  const seed = Math.floor(Math.random() * 1000);

  const overlay = document.createElement('div');
  overlay.className = 'lightning-overlay';
  skyEl.appendChild(overlay);

  const bolt1 = document.createElement('div');
  bolt1.className = 'lightning-bolt';
  bolt1.innerHTML = makeLightningSVG(seed);
  bolt1.style.left = (15 + Math.random() * 55) + '%';
  bolt1.style.top  = '0';
  skyEl.appendChild(bolt1);

  const bolt2 = document.createElement('div');
  bolt2.className = 'lightning-bolt lightning-bolt--sub';
  bolt2.innerHTML = makeLightningSVG(seed + 1);
  bolt2.style.left  = (10 + Math.random() * 65) + '%';
  bolt2.style.top   = '0';
  bolt2.style.animationDelay = '80ms';
  skyEl.appendChild(bolt2);

  setTimeout(() => { overlay.remove(); bolt1.remove(); bolt2.remove(); }, 1000);
}






// 새싹 & 땅
function makeSproutSVG() {
  const leaf = "M18 43 C18 43,2 27,2 14 a16 6 0 0 1 32 0 C34 27,18 43,18 43Z";
  const leafColor = "#93c47a", stemColor = "#6fa858";
  return `<svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="32" y="52" width="6" height="46" rx="3" fill="${stemColor}"/>
    <g transform="translate(34,58) rotate(-50) translate(-18,-43)">
      <path d="${leaf}" fill="${leafColor}"/>
    </g>
    <g transform="translate(36,48) rotate(50) translate(-18,-43)">
      <path d="${leaf}" fill="${leafColor}"/>
    </g>
  </svg>`;
}

function buildGround() {
  const row    = document.getElementById('groundBlockRow');
  const ground = document.getElementById('ground');
  if (!row || !ground) return;
  row.innerHTML = '';
  row.style.left           = ground.offsetLeft + 'px';
  row.style.right          = (sky.offsetWidth - ground.offsetLeft - ground.offsetWidth) + 'px';
  row.style.padding        = '0';
  row.style.justifyContent = 'space-evenly';
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('div');
    b.className = 'ground-block';
    b.innerHTML = makeSproutSVG();
    row.appendChild(b);
  }
}

buildGround();
window.addEventListener('resize', buildGround);






// 물방울 터짐 효과
function triggerBurst(x, y, name) {
  const ring = document.createElement('div');
  ring.className = 'burst-ring';
  ring.style.left = x + 'px';
  ring.style.top  = y + 'px';
  sky.appendChild(ring);
  setTimeout(() => ring.remove(), 500);

  [-80, -50, -20, 0, 20, 50, 80].forEach(deg => {
    const p   = document.createElement('div');
    p.className = 'burst-particle';
    const rad  = deg * Math.PI / 180;
    const dist = 18 + Math.random() * 16;
    p.style.left = x + 'px';
    p.style.top  = y + 'px';
    p.style.setProperty('--tx', `${Math.sin(rad) * dist}px`);
    p.style.setProperty('--ty', `${-Math.abs(Math.cos(rad)) * dist * 0.7}px`);
    p.style.animationDelay = Math.random() * 60 + 'ms';
    sky.appendChild(p);
    setTimeout(() => p.remove(), 600);
  });
}
