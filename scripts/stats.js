// 결과 테이블 업데이트
function updateResultRow(name, wt, tt) {
  const proc = processes.find(p => p.name === name);
  if (!proc) return;
  const ntt = proc.bt > 0 ? +(tt / proc.bt).toFixed(2) : 0;
  resultData[name] = { at: proc.at, bt: proc.bt, wt, tt, ntt };
  renderResultTable();
  renderPowerStats();
}

function renderResultTable() {
  const tbody = document.getElementById('resultBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  processes.forEach(p => {
    const d  = resultData[p.name];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td><td>${p.at}</td><td>${p.bt}</td>
      <td>${d ? d.wt  : '-'}</td>
      <td>${d ? d.tt  : '-'}</td>
      <td>${d ? d.ntt : '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}




// 전력 통계
function renderPowerStats() {
  const doneCount = Object.keys(resultData).length;
  let maxFinish = 0;
  Object.values(resultData).forEach(d => {
    const f = d.at + d.tt;
    if (f > maxFinish) maxFinish = f;
  });
  const ttVals = Object.values(resultData).map(d => d.tt);
  const avgTT  = ttVals.length
    ? +(ttVals.reduce((a, b) => a + b, 0) / ttVals.length).toFixed(2)
    : null;

  let totalWatt = 0, totalWork = 0;
  Object.values(coreState).forEach(s => {
    const cfg = POWER[s.type];
    totalWatt += (s.startupCount ?? 0) * cfg.startup;
    totalWatt += s.usedSeconds * cfg.watt;
    totalWork += s.usedSeconds * cfg.work;
  });
  totalWatt = +totalWatt.toFixed(2);

  const perf = ganttSeconds > 0 ? +(totalWork / ganttSeconds).toFixed(2) : null;
  const eff  = totalWatt > 0    ? +(totalWork / totalWatt).toFixed(2)    : null;

  /* 히스토리 기록 */
  if (ganttSeconds > 0) {
    const last = perfHistory[perfHistory.length - 1];
    if (!last || last.t !== ganttSeconds) {
      if (perf !== null) perfHistory.push({ t: ganttSeconds, v: perf });
      if (eff  !== null) effHistory.push({  t: ganttSeconds, v: eff  });
    }
  }

  const set = (id, val, unit = '') => {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== null ? `${val}${unit}` : '-';
  };
  set('pwVal-perf',  perf,                             ' work/s');
  set('pwVal-eff',   eff,                              ' work/W');
  set('pwVal-count', doneCount > 0 ? doneCount : null, '개');
  set('pwVal-time',  maxFinish > 0 ? maxFinish : null, 's');
  set('pwVal-avg',   avgTT,                            's');
  set('pwVal-total', totalWatt > 0 ? totalWatt : null, ' W');

  drawStatCanvas('perfCanvas', perfHistory, '#d05050');
  drawStatCanvas('effCanvas',  effHistory,  '#4080cc');
}

renderResultTable();
renderPowerStats();





// Canvas에 성능/효율 그래프 그리기
function drawStatCanvas(canvasId, history, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const W = canvas.offsetWidth  || 220;
  const H = canvas.offsetHeight || 100;
  if (canvas.width !== W * devicePixelRatio) {
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 10, right: 10, bottom: 22, left: 36 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top  - PAD.bottom;

  const data = history.filter(d => d.v !== null);
  // const maxT = data.length > 0 ? data[data.length - 1].t : 10;
  const maxT = ganttSeconds > 0 ? ganttSeconds : 10;
  const maxV = data.length > 0 ? Math.max(...data.map(d => d.v)) * 1.2 : 1;

  const tx = t => PAD.left + (t / maxT) * cw;
  const ty = v => PAD.top  + ch - (v / maxV) * ch;

  /* 격자 */
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cw, y); ctx.stroke();
  }

  /* Y축 레이블 */
  ctx.fillStyle = '#999';
  ctx.font      = '9px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = maxV * (1 - i / 4);
    const y = PAD.top + (ch / 4) * i;
    ctx.fillText(v.toFixed(1), PAD.left - 4, y + 3);
  }

  /* X축 레이블 */
  ctx.textAlign = 'center';
  const tickCount = Math.min(5, maxT);
  for (let i = 0; i <= tickCount; i++) {
    const t = Math.round((maxT / tickCount) * i);
    ctx.fillText(t + 's', tx(t), H - PAD.bottom + 13);
  }

  /* 축선 */
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + ch);
  ctx.lineTo(PAD.left + cw, PAD.top + ch);
  ctx.stroke();

  if (data.length < 2) return;

  /* 영역 채우기 */
  ctx.beginPath();
  ctx.moveTo(tx(data[0].t), PAD.top + ch);
  data.forEach(d => ctx.lineTo(tx(d.t), ty(d.v)));
  ctx.lineTo(tx(data[data.length - 1].t), PAD.top + ch);
  ctx.closePath();
  ctx.fillStyle = color + '22';
  ctx.fill();

  /* 꺾은선 */
  ctx.beginPath();
  ctx.moveTo(tx(data[0].t), ty(data[0].v));
  data.forEach(d => ctx.lineTo(tx(d.t), ty(d.v)));
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  /* 마지막 점 강조 */
  const last = data[data.length - 1];
  ctx.beginPath();
  ctx.arc(tx(last.t), ty(last.v), 3.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
