let dueCards = [];
let currentCardIdx = 0;

async function loadReview() {
  try {
    const [stats, cards] = await Promise.all([
      api('GET', '/api/review/stats'),
      api('GET', '/api/review/due'),
    ]);
    renderStats(stats);
    dueCards = cards;
    currentCardIdx = 0;
    if (dueCards.length > 0) {
      showCard();
    } else {
      document.getElementById('flashcard').classList.add('hidden');
      document.getElementById('reviewDone').classList.remove('hidden');
    }
  } catch { /* ignore */ }
}

function renderStats(s) {
  document.getElementById('reviewStats').innerHTML = `
    <span>전체 <strong>${s.total}</strong></span>
    <span>오늘 복습 <strong>${s.due}</strong></span>
    <span>학습중 <strong>${s.learning}</strong></span>
    <span>마스터 <strong>${s.mastered}</strong></span>
  `;
}

function showCard() {
  if (currentCardIdx >= dueCards.length) {
    document.getElementById('flashcard').classList.add('hidden');
    document.getElementById('reviewDone').classList.remove('hidden');
    updateDueCount();
    return;
  }
  const card = dueCards[currentCardIdx];
  document.getElementById('flashcard').classList.remove('hidden');
  document.getElementById('reviewDone').classList.add('hidden');
  document.getElementById('cardFront').textContent = card.word;
  document.getElementById('cardBack').classList.add('hidden');
  document.getElementById('showAnswer').classList.remove('hidden');
  document.getElementById('answerBtns').classList.add('hidden');

  // 사전에서 뜻 가져오기
  loadCardBack(card.word);
}

async function loadCardBack(word) {
  const backEl = document.getElementById('cardBack');
  try {
    const data = await api('GET', `/api/dictionary/${encodeURIComponent(word)}`);
    if (data.meanings?.length) {
      const m = data.meanings[0];
      backEl.innerHTML = `<strong>${data.phonetic || ''}</strong><br>(${m.partOfSpeech}) ${m.definitions[0].definition}`;
    } else {
      backEl.textContent = '뜻을 찾을 수 없습니다';
    }
  } catch {
    backEl.textContent = '뜻을 찾을 수 없습니다';
  }
}

document.getElementById('showAnswer').addEventListener('click', () => {
  document.getElementById('cardBack').classList.remove('hidden');
  document.getElementById('showAnswer').classList.add('hidden');
  document.getElementById('answerBtns').classList.remove('hidden');
});

document.getElementById('answerBtns').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-q]');
  if (!btn) return;
  const card = dueCards[currentCardIdx];
  try {
    await api('POST', '/api/review/answer', { word: card.word, quality: Number(btn.dataset.q) });
  } catch { /* ignore */ }
  currentCardIdx++;
  showCard();
});
