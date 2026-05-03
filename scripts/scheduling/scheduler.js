function getAlgo() {
  return document.getElementById('algoSelect').value;
}

function getTQ() {
  return Math.max(1, +document.getElementById('tqInput').value || 2);
}

function getEffectiveWeight(name, t) {
  const ps = processState[name];
  if (!ps) return 0;
  const waitTime = Math.max(0, t - ps.arrivalInQueue);
  return (ps.weight ?? 0) + Math.floor(waitTime / 3) * 2;
}

function selectNext(t, coreName) {
  const algo = getAlgo();
  const running = new Set(
    Object.values(coreState).filter(s => s.busy).map(s => s.currentProcess)
  );
  const available = readyQueueItems.filter(n => !running.has(n) && !resultData[n]);
  if (!available.length) return null;

  if (algo === 'SPN') {
    return available.reduce((best, n) => {
      const bp = processes.find(p => p.name === best)?.bt ?? Infinity;
      const np = processes.find(p => p.name === n)?.bt ?? Infinity;
      return np < bp ? n : best;
    });
  }

  if (algo === 'SRTN') {
    return available.reduce((best, n) => {
      const br = processState[best]?.remaining ?? Infinity;
      const nr = processState[n]?.remaining ?? Infinity;
      return nr < br ? n : best;
    });
  }

  if (algo === 'HRRN') {
    let best = null, bestR = -Infinity;
    available.forEach(name => {
      const proc = processes.find(p => p.name === name);
      const ps   = processState[name];
      if (!proc || !ps) return;
      const waited = Math.max(0, t - ps.arrivalInQueue);
      const r = (waited + proc.bt) / proc.bt;
      if (r > bestR) { bestR = r; best = name; }
    });
    return best;
  }

  if (algo === '꽉꽉이(full-full-ee)') {
    const coreType = coreState[coreName]?.type;
    if (coreType === 'p') {
      return available.reduce((best, n) =>
        getEffectiveWeight(n, t) > getEffectiveWeight(best, t) ? n : best
      );
    } else {
      return available.reduce((best, n) =>
        getEffectiveWeight(n, t) < getEffectiveWeight(best, t) ? n : best
      );
    }
  }

  return available[0];
}

function trySchedule() {
  const freeCores = Object.keys(coreState).filter(k => !coreState[k].busy);
  for (const coreName of freeCores) {
    const next = selectNext(ganttSeconds, coreName);
    if (next == null) break;
    assignToCore(coreName, next);
  }
}

function assignToCore(coreName, procName) {
  const s    = coreState[coreName];
  const proc = processes.find(p => p.name === procName);
  if (!s || !proc) return;

  if (s.everUsed) incrementContextSwitch();

  s.busy           = true;
  s.currentProcess = procName;
  s.blockStart     = ganttSeconds;
  s.quantumLeft    = getTQ();
  s.everUsed       = true;
  s.startupCount   = (s.startupCount || 0) + 1; // 시동전력 카운트 추가


  requestAnimationFrame(() => dropFromCloud(procName));

  const track = document.getElementById(`gantt-track-${coreName.replace(/\s/g, '-')}`);
  if (track) {
    const block = document.createElement('div');
    block.className = 'gantt-block' + (s.type === 'p' ? ' gantt-block--p' : ' gantt-block--e');
    block.style.left  = (s.blockStart * TICK_PX) + 'px';
    block.style.width = '2px';
    block.textContent = procName;
    track.appendChild(block);
    s.blockEl = block;
    if (typeof updateActiveGanttBlocks === 'function') updateActiveGanttBlocks();
  }

  const ps = processState[procName];
  if (ps) {
    if (ps.firstStartTime == null) ps.firstStartTime = ganttSeconds;
    ps.coreName = coreName;
  }

  renderReadyQueue();
}

function finishCoreBlock(coreName) {
  const s = coreState[coreName];
  if (!s || !s.busy) return;
  if (typeof updateActiveGanttBlocks === 'function') updateActiveGanttBlocks(ganttSeconds);
  s.blockEl = null;
}

function completeProcess(coreName) {
  const s = coreState[coreName];
  if (!s || !s.busy) return;
  const procName = s.currentProcess;
  const proc     = processes.find(p => p.name === procName);
  const ps       = processState[procName];

  finishCoreBlock(coreName);

  if (proc && ps) {
    const tt = Math.max(0, ganttSeconds - proc.at);
    const wt = Math.max(0, tt - (ps.cpuTicks ?? 0));
    updateResultRow(procName, wt, tt);
  }

  const idx = readyQueueItems.indexOf(procName);
  if (idx !== -1) readyQueueItems.splice(idx, 1);
  renderReadyQueue();

  s.busy = false; s.currentProcess = null;
  s.blockStart = null; s.quantumLeft = 0;
  if (ps) ps.coreName = null;
}

function requeueProcess(coreName) {
  const s = coreState[coreName];
  if (!s || !s.busy) return;

  finishCoreBlock(coreName);

  const procName = s.currentProcess;
  const idx = readyQueueItems.indexOf(procName);
  if (idx !== -1) {
    readyQueueItems.splice(idx, 1);
    readyQueueItems.push(procName);
  }
  renderReadyQueue();

  s.busy = false; s.currentProcess = null;
  s.blockStart = null; s.quantumLeft = 0;
  const ps = processState[procName];
  if (ps) ps.coreName = null;
}

function preemptCore(coreName) {
  const s = coreState[coreName];
  if (!s || !s.busy) return;

  finishCoreBlock(coreName);

  const procName = s.currentProcess;
  const idx = readyQueueItems.indexOf(procName);
  if (idx !== -1) readyQueueItems.splice(idx, 1);
  readyQueueItems.unshift(procName);
  renderReadyQueue();

  s.busy = false; s.currentProcess = null;
  s.blockStart = null; s.quantumLeft = 0;
  const ps = processState[procName];
  if (ps) ps.coreName = null;
}

function checkAllDone() {
  if (!processes.length) return;
  if (processes.every(p => resultData[p.name]) && Object.values(coreState).every(s => !s.busy)) {
    stopGanttTimer();
    running = false;
    const btn = document.getElementById('startBtn');
    btn.textContent = '시작';
    btn.classList.remove('running');
    processes.forEach(p => {
      const droplet = document.getElementById(`cloud-${p.name}`)?.querySelector('.droplet');
      if (droplet) droplet.style.opacity = '1';
    });
  }
}