// Ready Queue 관리
const readyQueueItems = [];

function positionReadyQueue() {}

function renderReadyQueue() {
  const track = document.getElementById('rqTrack');
  if (!track) return;
  track.innerHTML = '';

  // 현재 코어에서 실행 중인 프로세스는 레디 큐에서 숨김
  const runningSet = new Set(
    Object.values(coreState).filter(s => s.busy).map(s => s.currentProcess)
  );
  const visible = readyQueueItems.filter(n => !runningSet.has(n));
  const total = visible.length;

  visible.forEach((name, idx) => {
    const node = document.createElement('div');
    node.className   = 'rq-node';
    node.id          = `rq-${name}`;
    node.textContent = name;

    const t = total <= 1 ? 1 : idx / (total - 1);
    const l = Math.round(32 + t * 30);
    node.style.background = `hsl(207, 70%, ${l}%)`;
    track.appendChild(node);
  });
}

function addToReadyQueue(name) {
  if (readyQueueItems.includes(name) || resultData[name]) return;
  const proc = processes.find(p => p.name === name);
  readyQueueItems.push(name);
  processState[name] = {
    arrivalInQueue: ganttSeconds,
    remaining: proc ? proc.bt : 0,
    firstStartTime: null,
    coreName: null,
  };
  renderReadyQueue();
  trySchedule();
}

positionReadyQueue();
window.addEventListener('resize', positionReadyQueue);

document.getElementById('rqTrack').addEventListener('wheel', (e) => {
  e.preventDefault();
  e.currentTarget.scrollLeft += e.deltaY;
}, { passive: false });
