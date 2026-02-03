// --- Step 16: YouTube IFrame 초기화 + URL 입력 ---
let ytPlayer = null;
let currentVideoId = null;
let segments = [];
let activeSegIdx = -1;
let repeatMode = false;
let repeatSegIdx = -1;
let syncInterval = null;

// YouTube IFrame API 로드
const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(tag);

window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player('player', {
    height: '100%', width: '100%',
    playerVars: { rel: 0, modestbranding: 1 },
    events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange },
  });
};

function onPlayerReady() { /* ready */ }

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING && !syncInterval) {
    syncInterval = setInterval(syncSubtitle, 200);
  }
  if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// 영상 로드
document.getElementById('loadBtn').addEventListener('click', loadVideo);
document.getElementById('videoUrl').addEventListener('keypress', e => { if (e.key === 'Enter') loadVideo(); });

async function loadVideo() {
  const url = document.getElementById('videoUrl').value.trim();
  if (!url) return;
  const status = document.getElementById('loadStatus');
  status.textContent = '자막 추출 중...';
  status.className = 'status';
  status.classList.remove('hidden');

  try {
    const data = await api('POST', '/api/video/load', { url });
    currentVideoId = data.videoId;
    segments = data.segments;
    if (ytPlayer && ytPlayer.loadVideoById) {
      ytPlayer.loadVideoById(currentVideoId);
    }
    document.getElementById('playerArea').classList.remove('hidden');
    status.classList.add('hidden');
    renderSubtitles();
  } catch (e) {
    status.textContent = e.message;
    status.className = 'status error';
  }
}

// --- Step 17: 자막 목록 렌더링 + 구간 이동 ---
function renderSubtitles() {
  const list = document.getElementById('subtitleList');
  list.innerHTML = segments.map((s, i) => `
    <div class="sub-item" data-idx="${i}">
      <span class="sub-time">${fmtTime(s.start)}</span>
      <span class="sub-text">${escHtml(s.text)}</span>
    </div>
  `).join('');

  list.addEventListener('click', e => {
    const item = e.target.closest('.sub-item');
    if (!item) return;
    const idx = Number(item.dataset.idx);
    seekToSegment(idx);
  });
}

function seekToSegment(idx) {
  if (!ytPlayer || idx < 0 || idx >= segments.length) return;
  ytPlayer.seekTo(segments[idx].start, true);
  ytPlayer.playVideo();
  setActiveSegment(idx);
  if (repeatMode) repeatSegIdx = idx;
}

function setActiveSegment(idx) {
  if (activeSegIdx === idx) return;
  const list = document.getElementById('subtitleList');
  list.querySelectorAll('.sub-item').forEach(el => el.classList.remove('active'));
  const el = list.querySelector(`[data-idx="${idx}"]`);
  if (el) {
    el.classList.add('active');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  activeSegIdx = idx;
}

function syncSubtitle() {
  if (!ytPlayer || !ytPlayer.getCurrentTime) return;
  const t = ytPlayer.getCurrentTime();

  // 구간 반복 체크
  if (repeatMode && repeatSegIdx >= 0) {
    const seg = segments[repeatSegIdx];
    if (t >= seg.end || t < seg.start - 0.5) {
      ytPlayer.seekTo(seg.start, true);
      return;
    }
  }

  // 현재 구간 동기화
  for (let i = 0; i < segments.length; i++) {
    if (t >= segments[i].start && t < segments[i].end) {
      setActiveSegment(i);
      return;
    }
  }
}

// --- Step 18: 구간 반복 + 속도 조절 ---
document.getElementById('repeatBtn').addEventListener('click', () => {
  repeatMode = !repeatMode;
  document.getElementById('repeatBtn').classList.toggle('active', repeatMode);
  if (repeatMode) {
    const idx = findCurrentSegment();
    if (idx < 0) {
      repeatMode = false;
      document.getElementById('repeatBtn').classList.remove('active');
      return;
    }
    repeatSegIdx = idx;
    seekToSegment(idx);
  } else {
    repeatSegIdx = -1;
  }
});

function findCurrentSegment() {
  if (!ytPlayer || !ytPlayer.getCurrentTime) return activeSegIdx >= 0 ? activeSegIdx : 0;
  const t = ytPlayer.getCurrentTime();
  // 현재 시간이 포함된 구간
  for (let i = 0; i < segments.length; i++) {
    if (t >= segments[i].start && t < segments[i].end) return i;
  }
  // 가장 가까운 다음 구간
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].start > t) return i;
  }
  return segments.length - 1;
}

document.getElementById('speedSelect').addEventListener('change', e => {
  if (ytPlayer && ytPlayer.setPlaybackRate) {
    ytPlayer.setPlaybackRate(Number(e.target.value));
  }
});

// 단어 분석 버튼
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  if (!currentVideoId) return;
  const result = document.getElementById('vocabResult');
  const list = document.getElementById('vocabList');
  result.classList.remove('hidden');
  list.innerHTML = '<p>분석 중...</p>';

  try {
    const data = await api('POST', `/api/video/${currentVideoId}/vocab`);
    renderVocab(data.vocab);
  } catch (e) {
    list.innerHTML = `<p class="error">${e.message}</p>`;
  }
});

function renderVocab(vocab) {
  const list = document.getElementById('vocabList');
  list.innerHTML = vocab.slice(0, 100).map(v => `
    <div class="vocab-item">
      <span class="vocab-word">${escHtml(v.word)}</span>
      <span class="vocab-cefr ${v.cefr}">${v.cefr}</span>
      <span class="vocab-pos">${v.pos}</span>
      <span class="vocab-count">x${v.count}</span>
      <button class="vocab-add" data-word="${escAttr(v.word)}" data-cefr="${v.cefr}" data-pos="${v.pos}" data-ctx="${escAttr(JSON.stringify(v.contexts))}">+ 단어장</button>
    </div>
  `).join('');

  list.addEventListener('click', async e => {
    const btn = e.target.closest('.vocab-add');
    if (!btn || btn.classList.contains('added')) return;
    try {
      await api('POST', '/api/wordbook/add', {
        word: btn.dataset.word,
        cefr: btn.dataset.cefr,
        pos: btn.dataset.pos,
        contexts: JSON.parse(btn.dataset.ctx),
      });
      btn.textContent = '추가됨';
      btn.classList.add('added');
    } catch { /* ignore */ }
  });
}

// 유틸
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return s.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
