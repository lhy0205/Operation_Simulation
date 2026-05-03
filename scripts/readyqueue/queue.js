const readyQueueItems = [];
function positionReadyQueue() {}

function renderReadyQueue() {
  const track = document.getElementById('rqTrack');
  if (!track) return;
  track.innerHTML = '';

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


function calcWeight(bt) {
  // const t = bt % 3 === 0 ? 10 : bt % 3 === 1 ? 5 : 0;
  const t = bt % 2 === 0 ? 10 : bt % 2 === 1 ? 5 : 0;
  return bt + t;
}

function addToReadyQueue(name) {
  if (readyQueueItems.includes(name) || resultData[name]) return;
  const proc = processes.find(p => p.name === name);
  readyQueueItems.push(name);
  processState[name] = {
    arrivalInQueue: ganttSeconds,
    remaining: proc ? proc.bt : 0,
    weight: proc ? calcWeight(proc.bt) : 0,
    firstStartTime: null,
    coreName: null,
    cpuTicks: 0,
  };
  renderReadyQueue();
}

positionReadyQueue();
window.addEventListener('resize', positionReadyQueue);

document.getElementById('rqTrack').addEventListener('wheel', (e) => {
  e.preventDefault();
  e.currentTarget.scrollLeft += e.deltaY;
}, { passive: false });
