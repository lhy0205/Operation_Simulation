// 사이드바 토글
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




// 코어 수 조절
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

  if (typeof buildGantt === 'function' && document.getElementById('ganttRows')) {
    buildGantt();
  }
}

pSlider.addEventListener('input', () => clampCores('p'));
eSlider.addEventListener('input', () => clampCores('e'));
clampCores('p');




// 프로세스 테이블 렌더링
function render() {
  const tbody = document.getElementById('procBody');
  tbody.innerHTML = '';

  processes.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td><input class="cell-input" type="number" min="0" value="${p.at}"
          onchange="processes[${i}].at = +this.value"></td>
      <td><input class="cell-input" type="number" min="1" value="${p.bt}"
          onchange="processes[${i}].bt = +this.value"></td>
      <td><button class="del-btn" onclick="delProc(${i})">✕</button></td>
    `;
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
  processes.push({ name, at: +at, bt: Math.max(1, +bt) });
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
  const name = processes[i].name;
  processes.splice(i, 1);
  render();
  removeCloud(name);
}

document.getElementById('addBtn').addEventListener('click', addProcess);
document.getElementById('randBtn1').addEventListener('click', () => addRandomProcess());
document.getElementById('randBtn15').addEventListener('click', () => { for (let i = 0; i < 15; i++) addRandomProcess(); });

['inputAT', 'inputBT'].forEach(id => {
  document.getElementById(id).addEventListener('keypress', (e) => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });
});
document.getElementById('inputAT').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('inputBT').focus();
});
document.getElementById('inputBT').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addProcess();
});





// 속도/시작/재설정
function setSpeed(s) {
  speed = s;
  document.getElementById('spd1').classList.toggle('active', s === 1);
  document.getElementById('spd3').classList.toggle('active', s === 3);
  if (running) {
    stopGanttTimer();
    startGanttTimer();
  }
}

function toggleStart() {
  running = !running;
  const btn = document.getElementById('startBtn');
  btn.textContent = running ? '정지' : '시작';
  btn.classList.toggle('running', running);

  if (running) {
    startDropAnimation();
    startGanttTimer();
  } else {
    stopDropAnimation();
    stopGanttTimer();
  }
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
  if (ctxEl) ctxEl.textContent = '0회';
  perfHistory.length = 0;
  effHistory.length  = 0;

  Object.keys(coreState).forEach(k => {
    coreState[k].busy = false; coreState[k].currentProcess = null;
    coreState[k].startTime = null; coreState[k].finishTime = null;
    coreState[k].usedSeconds = 0; coreState[k].everUsed = false;
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





// Time Quantum 입력 활성화
const algoSelect = document.getElementById('algoSelect');
const tqInput    = document.getElementById('tqInput');

function updateTQ() {
  const isRR = algoSelect.value === 'Round Robin';
  tqInput.disabled = !isRR;
}

algoSelect.addEventListener('change', updateTQ);
updateTQ();
