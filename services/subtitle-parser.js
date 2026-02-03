const fs = require('fs');
const webvtt = require('node-webvtt');

function parse(vttPath) {
  const raw = fs.readFileSync(vttPath, 'utf-8');
  try {
    const parsed = webvtt.parse(raw, { strict: false });
    return parsed.cues.map(c => ({
      start: c.start,
      end: c.end,
      text: cleanText(c.text),
    }));
  } catch {
    return parseFallback(raw);
  }
}

function parseFallback(raw) {
  const cues = [];
  const re = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\s*\n([\s\S]*?)(?=\n\n|\n\d{2}:|\s*$)/g;
  let m;
  while ((m = re.exec(raw))) {
    cues.push({
      start: toSeconds(m[1]),
      end: toSeconds(m[2]),
      text: cleanText(m[3]),
    });
  }
  return cues;
}

function toSeconds(ts) {
  const [h, m, s] = ts.split(':');
  return +h * 3600 + +m * 60 + parseFloat(s);
}

function cleanText(t) {
  return t.replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim();
}

function mergeSegments(cues, gap = 5) {
  if (!cues.length) return [];
  const merged = [];
  let cur = { ...cues[0] };
  for (let i = 1; i < cues.length; i++) {
    const c = cues[i];
    if (c.text === cur.text) continue; // 자동자막 중복 제거
    if (c.start - cur.end < gap && cur.text.split(' ').length < 20) {
      cur.end = c.end;
      cur.text += ' ' + c.text;
    } else {
      merged.push(cur);
      cur = { ...c };
    }
  }
  merged.push(cur);
  return merged;
}

module.exports = { parse, mergeSegments };
