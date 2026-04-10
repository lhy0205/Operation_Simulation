// Ready Queue 관리
const readyQueueItems = [];

function positionReadyQueue() {}

function renderReadyQueue() {
  const track = document.getElementById('rqTrack');
  if (!track) return;
  track.innerHTML = '';

  const total = readyQueueItems.length;
  readyQueueItems.forEach((name, idx) => {
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
  if (!readyQueueItems.includes(name)) {
    readyQueueItems.push(name);
    processState[name] = { arrivalInQueue: ganttSeconds, startTime: null, coreName: null };
    renderReadyQueue();
    trySchedule();
  }
}

positionReadyQueue();
window.addEventListener('resize', positionReadyQueue);

document.getElementById('rqTrack').addEventListener('wheel', (e) => {
  e.preventDefault();
  e.currentTarget.scrollLeft += e.deltaY;
}, { passive: false });
