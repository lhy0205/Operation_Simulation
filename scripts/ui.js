const sidebar     = document.getElementById('sidebar');
const leftCol     = document.getElementById('leftCol');
const bottomBar   = document.getElementById('bottomBar');
const toggleBtn   = document.getElementById('sidebarToggle');
const toggleArrow = document.getElementById('toggleArrow');

let sidebarOpen = true;

toggleBtn.addEventListener('click', () => {
  sidebarOpen = !sidebarOpen;
  sidebar.classList.toggle('collapsed', !sidebarOpen);
  leftCol.classList.toggle('collapsed', !sidebarOpen);
  bottomBar.classList.toggle('collapsed', !sidebarOpen);
  toggleArrow.innerHTML = sidebarOpen ? '&#9664;' : '&#9654;';
});

const pSlider    = document.getElementById('pSlider');
const eSlider    = document.getElementById('eSlider');
const pValEl     = document.getElementById('pVal');
const eValEl     = document.getElementById('eVal');
const badgesEl   = document.getElementById('badges');
const limitMsgEl = document.getElementById('coreLimitMsg');

function clampCores(changed) {
  let p = +pSlider.value;
  let e = +eSlider.value;

  if (p + e > MAX_CORES) {
    if (changed === 'p') {
      e = MAX_CORES - p;
      eSlider.value = e;
    } else {
      p = MAX_CORES - e;
      pSlider.value = p;
    }
  }

  pValEl.textContent = p;
  eValEl.textContent = e;

  const total = p + e;
  limitMsgEl.textContent = total === MAX_CORES
    ? `총 ${total}코어 (최대)`
    : `총 ${total}코어`;
  limitMsgEl.style.color = total === MAX_CORES ? '#c0353f' : '#2a6645';

  let html = `<span class="badge badge-p">P ${p}</span>`;
  if (e > 0) html += `<span class="badge badge-e">E ${e}</span>`;
  badgesEl.innerHTML = html;

  if (!running && typeof buildGantt === 'function' && document.getElementById('ganttRows')) {
    buildGantt();
  }
}

pSlider.addEventListener('input', () => clampCores('p'));
eSlider.addEventListener('input', () => clampCores('e'));
clampCores('p');

function render() {
  const tbody = document.getElementById('procBody');
  tbody.innerHTML = '';

  processes.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td><input class="cell-input" type="number" min="0" value="${p.at}"></td>
      <td><input class="cell-input" type="number" min="1" value="${p.bt}"></td>
      <td><button class="del-btn" type="button">X</button></td>
    `;

    const inputs = tr.querySelectorAll('input');
    inputs[0].addEventListener('change', e => { processes[i].at = Math.max(0, +e.target.value || 0); });
    inputs[1].addEventListener('change', e => { processes[i].bt = Math.max(1, +e.target.value || 1); });
    tr.querySelector('button').addEventListener('click', () => delProc(i));
    tbody.appendChild(tr);
  });
}

function addProcess() {
  const atInput = document.getElementById('inputAT');
  const btInput = document.getElementById('inputBT');

  const at = atInput.value.trim();
  const bt = btInput.value.trim();

  if (at === '' || bt === '') {
    atInput.style.borderColor = at === '' ? '#e05555' : '#9ad4b4';
    btInput.style.borderColor = bt === '' ? '#e05555' : '#9ad4b4';
    return;
  }

  atInput.style.borderColor = '#9ad4b4';
  btInput.style.borderColor = '#9ad4b4';

  const name = 'P' + pidCount;
  processes.push({ name, at: Math.max(0, +at || 0), bt: Math.max(1, +bt || 1) });
  pidCount++;

  atInput.value = '';
  btInput.value = '';
  atInput.focus();

  render();
  document.getElementById('tableWrapper').scrollTop = 99999;
  createCloud(name);
}

function addRandomProcess() {
  const at = Math.floor(Math.random() * 11);
  const bt = Math.floor(Math.random() * 10) + 1;
  const name = 'P' + pidCount;
  processes.push({ name, at, bt });
  pidCount++;
  render();
  document.getElementById('tableWrapper').scrollTop = 99999;
  createCloud(name);
}

function delProc(i) {
  const proc = processes[i];
  if (!proc) return;
  processes.splice(i, 1);
  delete resultData[proc.name];
  delete processState[proc.name];
  const idx = readyQueueItems.indexOf(proc.name);
  if (idx !== -1) readyQueueItems.splice(idx, 1);
  render();
  renderReadyQueue();
  if (typeof renderResultTable === 'function') renderResultTable();
  removeCloud(proc.name);
}

document.getElementById('addBtn').addEventListener('click', addProcess);
document.getElementById('randBtn1').addEventListener('click', () => addRandomProcess());
document.getElementById('randBtn15').addEventListener('click', () => {
  for (let i = 0; i < 15; i++) addRandomProcess();
});

['inputAT', 'inputBT'].forEach(id => {
  document.getElementById(id).addEventListener('keypress', e => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });
});

document.getElementById('inputAT').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('inputBT').focus();
});
document.getElementById('inputBT').addEventListener('keydown', e => {
  if (e.key === 'Enter') addProcess();
});

function setSpeed(s) {
  speed = s;
  document.getElementById('spd1').classList.toggle('active', s === 1);
  document.getElementById('spd3').classList.toggle('active', s === 3);
  if (running) {
    stopGanttTimer();
    startGanttTimer();
  }
}

function syncProcessInputs() {
  document.querySelectorAll('#procBody tr').forEach((tr, i) => {
    const inputs = tr.querySelectorAll('input');
    if (!processes[i] || inputs.length < 2) return;
    processes[i].at = Math.max(0, +inputs[0].value || 0);
    processes[i].bt = Math.max(1, +inputs[1].value || 1);
    inputs[0].value = processes[i].at;
    inputs[1].value = processes[i].bt;
  });
}

function hasSimulationState() {
  return ganttSeconds > 0
    || readyQueueItems.length > 0
    || Object.keys(resultData).length > 0
    || Object.keys(processState).length > 0
    || Object.values(coreState).some(s => s.busy || s.usedSeconds > 0 || s.everUsed);
}

function resetSimulationRun() {
  stopDropAnimation();
  stopGanttTimer();
  document.querySelectorAll('.falling-drop').forEach(el => el.remove());

  readyQueueItems.length = 0;
  Object.keys(resultData).forEach(k  => delete resultData[k]);
  Object.keys(processState).forEach(k => delete processState[k]);
  Object.keys(coreState).forEach(k => delete coreState[k]);

  contextSwitchCount = 0;
  const ctxEl = document.getElementById('pwVal-ctx');
  if (ctxEl) ctxEl.textContent = '0';
  perfHistory.length = 0;
  effHistory.length  = 0;

  resetGanttTimer();
  renderReadyQueue();
  if (typeof renderResultTable === 'function') renderResultTable();
  if (typeof renderPowerStats  === 'function') renderPowerStats();

  processes.forEach(p => {
    if (!document.getElementById(`cloud-${p.name}`)) createCloud(p.name);
    const droplet = document.getElementById(`cloud-${p.name}`)?.querySelector('.droplet');
    if (droplet) droplet.style.opacity = '1';
  });
}

function toggleStart() {
  const btn = document.getElementById('startBtn');

  if (running) {
    running = false;
    btn.textContent = '시작';
    btn.classList.remove('running');
    stopDropAnimation();
    stopGanttTimer();
    return;
  }

  syncProcessInputs();

  if (!processes.length) {
    btn.textContent = '시작';
    btn.classList.remove('running');
    return;
  }

  if (hasSimulationState()) resetSimulationRun();

  running = true;
  btn.textContent = '정지';
  btn.classList.add('running');
  startDropAnimation();
  startGanttTimer();
}

function resetAll() {
  running = false;
  stopDropAnimation();
  stopGanttTimer();
  resetGanttTimer();
  document.getElementById('startBtn').textContent = '시작';
  document.getElementById('startBtn').classList.remove('running');

  document.querySelectorAll('.falling-drop').forEach(el => el.remove());
  processes.forEach(p => removeCloud(p.name));
  processes = [];
  pidCount  = 1;

  readyQueueItems.length = 0;
  contextSwitchCount = 0;
  const ctxEl = document.getElementById('pwVal-ctx');
  if (ctxEl) ctxEl.textContent = '0';
  perfHistory.length = 0;
  effHistory.length  = 0;

  Object.keys(coreState).forEach(k => {
    coreState[k].busy = false; coreState[k].currentProcess = null;
    coreState[k].startTime = null; coreState[k].finishTime = null;
    coreState[k].blockStart = null; coreState[k].quantumLeft = 0; coreState[k].blockEl = null;
    coreState[k].usedSeconds = 0; coreState[k].everUsed = false; coreState[k].startupCount = 0;
  });
  Object.keys(resultData).forEach(k  => delete resultData[k]);
  Object.keys(processState).forEach(k => delete processState[k]);

  renderReadyQueue();
  if (typeof renderResultTable === 'function') renderResultTable();
  if (typeof renderPowerStats  === 'function') renderPowerStats();
  render();
}

document.getElementById('spd1').addEventListener('click', () => setSpeed(1));
document.getElementById('spd3').addEventListener('click', () => setSpeed(3));
document.getElementById('startBtn').addEventListener('click', toggleStart);
document.getElementById('resetBtn').addEventListener('click', resetAll);

render();

const algoSelect = document.getElementById('algoSelect');
const tqInput    = document.getElementById('tqInput');

function updateTQ() {
  const isRR = algoSelect.value === 'RR';
  tqInput.disabled = !isRR;
}

algoSelect.addEventListener('change', updateTQ);
updateTQ();
