const nlp = require('compromise');
const fs = require('fs');
const path = require('path');

const cefrPath = path.join(__dirname, '..', 'data', 'cefr-wordlist.json');
const cefrMap = JSON.parse(fs.readFileSync(cefrPath, 'utf-8'));

const STOP_WORDS = new Set([
  'i','me','my','myself','we','our','ours','ourselves','you','your','yours',
  'he','him','his','she','her','hers','it','its','they','them','their',
  'what','which','who','whom','this','that','these','those','am','is','are',
  'was','were','be','been','being','have','has','had','having','do','does',
  'did','doing','a','an','the','and','but','if','or','because','as','until',
  'while','of','at','by','for','with','about','against','between','through',
  'during','before','after','above','below','to','from','up','down','in',
  'out','on','off','over','under','again','further','then','once','here',
  'there','when','where','why','how','all','both','each','few','more','most',
  'other','some','such','no','nor','not','only','own','same','so','than',
  'too','very','s','t','can','will','just','don','should','now','d','ll',
  'm','o','re','ve','y','ain','aren','couldn','didn','doesn','hadn','hasn',
  'haven','isn','ma','mightn','mustn','needn','shan','shouldn','wasn',
  'weren','won','wouldn',
]);

function analyze(segments) {
  const text = segments.map(s => s.text).join(' ');
  const doc = nlp(text);
  const wordFreq = new Map();

  doc.terms().forEach(term => {
    const t = term.text('root') || term.text('normal');
    const word = t.toLowerCase().replace(/[^a-z'-]/g, '');
    if (!word || word.length < 2 || STOP_WORDS.has(word)) return;
    if (/^\d+$/.test(word)) return;
    const info = wordFreq.get(word) || { word, count: 0, pos: '', contexts: [] };
    info.count++;
    // POS 태깅
    const tags = term.json()[0]?.terms?.[0]?.tags || [];
    if (tags.includes('Noun')) info.pos = 'noun';
    else if (tags.includes('Verb')) info.pos = 'verb';
    else if (tags.includes('Adjective')) info.pos = 'adj';
    else if (tags.includes('Adverb')) info.pos = 'adv';
    wordFreq.set(word, info);
  });

  // 문맥 추출
  for (const seg of segments) {
    const lower = seg.text.toLowerCase();
    for (const [word, info] of wordFreq) {
      if (lower.includes(word) && info.contexts.length < 2) {
        info.contexts.push(seg.text);
      }
    }
  }

  // CEFR 레벨 매핑
  const results = [...wordFreq.values()].map(w => ({
    ...w,
    cefr: cefrMap[w.word] || 'unknown',
  }));

  results.sort((a, b) => b.count - a.count);
  return results;
}

module.exports = { analyze };
