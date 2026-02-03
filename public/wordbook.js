let wordbookData = [];
const dictCache = {};

async function loadWordbook() {
  try {
    wordbookData = await api('GET', '/api/wordbook');
    renderWordbook();
  } catch { /* ignore */ }
}

function renderWordbook() {
  const filter = document.getElementById('cefrFilter').value;
  const filtered = filter === 'all' ? wordbookData : wordbookData.filter(w => w.cefr === filter);
  document.getElementById('wordCount').textContent = `${filtered.length} 단어`;

  const list = document.getElementById('wordbookList');
  list.innerHTML = filtered.map(w => `
    <div class="wb-item" data-word="${escAttr(w.word)}">
      <div class="wb-header">
        <span class="wb-word">${escHtml(w.word)}</span>
        <span class="vocab-cefr ${w.cefr}">${w.cefr}</span>
        <span class="wb-phonetic" data-word="${escAttr(w.word)}"></span>
        <button class="wb-audio hidden" data-word="${escAttr(w.word)}" title="발음 듣기">&#128266;</button>
        <button class="wb-delete" data-word="${escAttr(w.word)}">삭제</button>
      </div>
      <div class="wb-meaning" data-word="${escAttr(w.word)}">로딩...</div>
      ${w.contexts && w.contexts.length ? `<div class="wb-context">"${escHtml(w.contexts[0])}"</div>` : ''}
    </div>
  `).join('');

  // 사전 로딩
  filtered.forEach(w => loadDict(w.word));

  // 이벤트
  list.addEventListener('click', e => {
    const delBtn = e.target.closest('.wb-delete');
    if (delBtn) {
      deleteWord(delBtn.dataset.word);
      return;
    }
    const audioBtn = e.target.closest('.wb-audio');
    if (audioBtn && dictCache[audioBtn.dataset.word]?.audio) {
      new Audio(dictCache[audioBtn.dataset.word].audio).play();
    }
  });
}

async function loadDict(word) {
  if (dictCache[word]) {
    applyDict(word, dictCache[word]);
    return;
  }
  try {
    const data = await api('GET', `/api/dictionary/${encodeURIComponent(word)}`);
    dictCache[word] = data;
    applyDict(word, data);
  } catch {
    const el = document.querySelector(`.wb-meaning[data-word="${CSS.escape(word)}"]`);
    if (el) el.textContent = '';
  }
}

function applyDict(word, data) {
  const sel = CSS.escape(word);
  const phonEl = document.querySelector(`.wb-phonetic[data-word="${sel}"]`);
  if (phonEl) phonEl.textContent = data.phonetic;
  const audioBtn = document.querySelector(`.wb-audio[data-word="${sel}"]`);
  if (audioBtn && data.audio) audioBtn.classList.remove('hidden');
  const meanEl = document.querySelector(`.wb-meaning[data-word="${sel}"]`);
  if (meanEl && data.meanings?.length) {
    const def = data.meanings[0].definitions[0];
    meanEl.textContent = `(${data.meanings[0].partOfSpeech}) ${def.definition}`;
  }
}

async function deleteWord(word) {
  try {
    await api('DELETE', `/api/wordbook/${encodeURIComponent(word)}`);
    wordbookData = wordbookData.filter(w => w.word !== word);
    renderWordbook();
  } catch { /* ignore */ }
}

document.getElementById('cefrFilter').addEventListener('change', renderWordbook);
