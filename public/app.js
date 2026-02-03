// PIN 저장
let accessPin = localStorage.getItem('accessPin') || '';

// API 헬퍼
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'x-access-pin': accessPin } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '요청 실패');
  return data;
}

// DOM
const pinModal = document.getElementById('pinModal');
const pinInput = document.getElementById('pinInput');
const pinSubmit = document.getElementById('pinSubmit');
const pinError = document.getElementById('pinError');
const appEl = document.getElementById('app');

// PIN 검증
if (accessPin) {
  pinModal.classList.add('hidden');
  appEl.classList.remove('hidden');
  onAppReady();
}

pinSubmit.addEventListener('click', verifyPin);
pinInput.addEventListener('keypress', e => { if (e.key === 'Enter') verifyPin(); });

async function verifyPin() {
  const pin = pinInput.value.trim();
  try {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); });
    accessPin = pin;
    localStorage.setItem('accessPin', pin);
    pinModal.classList.add('hidden');
    appEl.classList.remove('hidden');
    onAppReady();
  } catch {
    pinError.textContent = '잘못된 비밀번호';
    pinError.classList.remove('hidden');
  }
}

// 탭 전환
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    if (btn.dataset.tab === 'wordbook' && typeof loadWordbook === 'function') loadWordbook();
    if (btn.dataset.tab === 'review' && typeof loadReview === 'function') loadReview();
  });
});

function onAppReady() {
  // 복습 카운트 업데이트
  updateDueCount();
}

async function updateDueCount() {
  try {
    const stats = await api('GET', '/api/review/stats');
    const badge = document.getElementById('dueCount');
    if (stats.due > 0) {
      badge.textContent = stats.due;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch { /* ignore */ }
}
