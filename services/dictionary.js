const dictCache = new Map();

async function lookup(word) {
  const key = word.toLowerCase();
  if (dictCache.has(key)) return dictCache.get(key);

  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[0];
    const result = {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.[0]?.text || '',
      audio: entry.phonetics?.find(p => p.audio)?.audio || '',
      meanings: entry.meanings.slice(0, 3).map(m => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.slice(0, 2).map(d => ({
          definition: d.definition,
          example: d.example || '',
        })),
      })),
    };
    dictCache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

module.exports = { lookup };
