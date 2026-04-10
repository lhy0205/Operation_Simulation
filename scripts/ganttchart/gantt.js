// 간트 차트 관련 함수
function drawGanttBlock(coreName, startSec, durSec, procName, coreType) {
  const track = document.getElementById(`gantt-track-${coreName.replace(/\s/g, '-')}`);
  if (!track) return;
  const block = document.createElement('div');
  block.className = 'gantt-block' + (coreType === 'p' ? ' gantt-block--p' : ' gantt-block--e');
  block.style.left  = (startSec * TICK_PX) + 'px';
  block.style.width = Math.max(2, durSec * TICK_PX - 2) + 'px';
  block.textContent = procName;
  track.appendChild(block);
}

function makeGanttRow(label, type) {
  const row = document.createElement('div');
  row.className = 'gantt-row';

  const lbl = document.createElement('div');
  lbl.className = `gantt-row-label ${type}`;
  lbl.textContent = label;

  const totalW = Math.max(300, (ganttSeconds + 5) * TICK_PX);
  const track  = document.createElement('div');
  track.className = 'gantt-track';
  track.id = `gantt-track-${label.replace(/\s/g, '-')}`;
  track.style.width = totalW + 'px';

  const cursor = document.createElement('div');
  cursor.className = 'gantt-cursor';
  cursor.style.height = '100%';
  cursor.style.left   = (ganttSeconds * TICK_PX) + 'px';
  track.appendChild(cursor);

  row.appendChild(lbl);
  row.appendChild(track);
  return row;
}

function buildGantt() {
  const rows = document.getElementById('ganttRows');
  if (!rows) return;
  rows.innerHTML = '';

  const p = +pSlider.value, e = +eSlider.value;
  const newKeys = [];
  for (let i = 1; i <= p; i++) newKeys.push(`P-core ${i}`);
  for (let i = 1; i <= e; i++) newKeys.push(`E-core ${i}`);

  Object.keys(coreState).forEach(k => { if (!newKeys.includes(k)) delete coreState[k]; });
  newKeys.forEach(k => {
    if (!coreState[k]) coreState[k] = {
      type: k.startsWith('P') ? 'p' : 'e',
      usedSeconds: 0, everUsed: false,
      busy: false, currentProcess: null,
      startTime: null, finishTime: null
    };
  });

  for (let i = 0; i < p; i++) rows.appendChild(makeGanttRow(`P-core ${i+1}`, 'p-core'));
  for (let i = 0; i < e; i++) rows.appendChild(makeGanttRow(`E-core ${i+1}`, 'e-core'));

  const timeline = document.createElement('div');
  timeline.className = 'gantt-timeline';
  const spacer = document.createElement('div');
  spacer.className = 'gantt-timeline-spacer';
  const ticks = document.createElement('div');
  ticks.className = 'gantt-ticks';
  ticks.id = 'ganttTicks';
  timeline.appendChild(spacer);
  timeline.appendChild(ticks);
  rows.appendChild(timeline);
  drawTicks(ganttSeconds);
}

function drawTicks(upToSec) {
  const ticks = document.getElementById('ganttTicks');
  if (!ticks) return;
  ticks.innerHTML = '';
  const maxSec = Math.max(upToSec + 5, 15);
  const totalW = maxSec * TICK_PX;
  document.querySelectorAll('.gantt-track').forEach(t => { t.style.width = totalW + 'px'; });
  for (let s = 0; s <= maxSec; s++) {
    const tick = document.createElement('div');
    tick.className = 'gantt-tick';
    tick.style.left = (s * TICK_PX) + 'px';
    const line = document.createElement('div'); line.className = 'gantt-tick-line';
    const lbl  = document.createElement('div'); lbl.className  = 'gantt-tick-label'; lbl.textContent = s;
    tick.appendChild(line); tick.appendChild(lbl);
    ticks.appendChild(tick);
  }
  ticks.style.width = totalW + 'px';
}

function updateCursors(sec) {
  document.querySelectorAll('.gantt-cursor').forEach(c => { c.style.left = (sec * TICK_PX) + 'px'; });
  const scroll = document.getElementById('ganttScroll');
  if (!scroll) return;
  const cursorX = sec * TICK_PX + 64;
  if (cursorX > scroll.scrollLeft + scroll.offsetWidth - 20)
    scroll.scrollLeft = cursorX - scroll.offsetWidth + 80;
}

function startGanttTimer() {
  if (ganttTimer) return;
  ganttTimer = setInterval(() => {
    ganttSeconds++;
    drawTicks(ganttSeconds);
    updateCursors(ganttSeconds);
    Object.entries(coreState).forEach(([name, s]) => {
      if (s.busy) {
        s.usedSeconds++;
        if (ganttSeconds >= s.finishTime) completeProcess(name);
      }
    });
    renderPowerStats();
    checkAllDone();
  }, Math.round(1000 / speed));
}

function stopGanttTimer()  { clearInterval(ganttTimer); ganttTimer = null; }
function resetGanttTimer() { ganttSeconds = 0; buildGantt(); }

buildGantt();
window.addEventListener('resize', buildGantt);

document.getElementById('ganttScroll').addEventListener('wheel', (e) => {
  e.preventDefault();
  e.currentTarget.scrollLeft += e.deltaY;
}, { passive: false });
