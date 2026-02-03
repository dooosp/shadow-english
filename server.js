const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PIN 인증
function checkAuth(req, res, next) {
  const pin = req.headers['x-access-pin'] || req.body.pin;
  if (pin !== config.ACCESS_PIN) {
    return res.status(401).json({ error: '잘못된 비밀번호입니다' });
  }
  next();
}

app.post('/api/auth', (req, res) => {
  const { pin } = req.body;
  if (pin === config.ACCESS_PIN) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: '잘못된 비밀번호입니다' });
});

// --- Video routes ---
const extractor = require('./services/subtitle-extractor');
const parser = require('./services/subtitle-parser');
const store = require('./services/data-store');

app.post('/api/video/load', checkAuth, (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL을 입력하세요' });
    const { videoId, vttPath } = extractor.extract(url);
    const cues = parser.parse(vttPath);
    const segments = parser.mergeSegments(cues);
    store.write(`videos/${videoId}.json`, { videoId, segments });
    res.json({ videoId, segments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/video/:id', checkAuth, (req, res) => {
  const data = store.read(`videos/${req.params.id}.json`);
  if (!data) return res.status(404).json({ error: '영상 데이터 없음' });
  res.json(data);
});

// --- Vocab / Dictionary routes ---
const vocabAnalyzer = require('./services/vocab-analyzer');
const dictionary = require('./services/dictionary');

app.post('/api/video/:id/vocab', checkAuth, (req, res) => {
  const data = store.read(`videos/${req.params.id}.json`);
  if (!data) return res.status(404).json({ error: '영상 데이터 없음' });
  const vocab = vocabAnalyzer.analyze(data.segments);
  res.json({ videoId: req.params.id, vocab });
});

app.get('/api/dictionary/:word', checkAuth, async (req, res) => {
  const result = await dictionary.lookup(req.params.word);
  if (!result) return res.status(404).json({ error: '사전 데이터 없음' });
  res.json(result);
});

// --- Wordbook routes ---
const WORDBOOK_FILE = 'wordbook.json';

app.get('/api/wordbook', checkAuth, (req, res) => {
  res.json(store.read(WORDBOOK_FILE, []));
});

app.post('/api/wordbook/add', checkAuth, (req, res) => {
  const { word, cefr, pos, contexts } = req.body;
  if (!word) return res.status(400).json({ error: 'word 필수' });
  const book = store.read(WORDBOOK_FILE, []);
  if (book.find(w => w.word === word)) return res.json({ exists: true });
  book.push({ word, cefr: cefr || 'unknown', pos: pos || '', contexts: contexts || [], addedAt: new Date().toISOString() });
  store.write(WORDBOOK_FILE, book);
  // SRS 카드 자동 생성
  srs.getCard(word); // 초기화만 (due=today)
  srs.answer(word, 0); // 첫 카드 등록 (interval=1)
  res.json({ success: true });
});

app.delete('/api/wordbook/:word', checkAuth, (req, res) => {
  const book = store.read(WORDBOOK_FILE, []);
  const filtered = book.filter(w => w.word !== req.params.word);
  store.write(WORDBOOK_FILE, filtered);
  res.json({ success: true });
});

// --- SRS Review routes ---
const srs = require('./services/srs-engine');

app.get('/api/review/due', checkAuth, (req, res) => {
  res.json(srs.getDueCards());
});

app.post('/api/review/answer', checkAuth, (req, res) => {
  const { word, quality } = req.body;
  if (!word || quality == null) return res.status(400).json({ error: 'word, quality 필수' });
  const card = srs.answer(word, Number(quality));
  res.json(card);
});

app.get('/api/review/stats', checkAuth, (req, res) => {
  res.json(srs.getStats());
});

// --- yt-dlp 체크 ---
app.get('/api/health', (req, res) => {
  const ytdlp = extractor.checkYtdlp();
  res.json({ status: 'ok', ytdlp });
});

// 글로벌 에러 핸들러
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || '서버 오류' });
});

app.listen(config.PORT, () => {
  console.log(`shadow-english running on port ${config.PORT}`);
  if (!extractor.checkYtdlp()) {
    console.warn('⚠ yt-dlp 미설치. pip install yt-dlp 실행 필요');
  }
});

module.exports = { app, checkAuth };
