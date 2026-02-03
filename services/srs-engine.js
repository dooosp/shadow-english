const store = require('./data-store');
const SRS_FILE = 'srs-state.json';

function getState() {
  return store.read(SRS_FILE, {});
}

function getCard(word) {
  const state = getState();
  return state[word] || { word, rep: 0, ef: 2.5, interval: 0, due: today() };
}

function answer(word, quality) {
  // quality: 0-5 (0=complete blackout, 5=perfect)
  const state = getState();
  const card = state[word] || { word, rep: 0, ef: 2.5, interval: 0, due: today() };

  if (quality >= 3) {
    if (card.rep === 0) card.interval = 1;
    else if (card.rep === 1) card.interval = 6;
    else card.interval = Math.round(card.interval * card.ef);
    card.rep++;
  } else {
    card.rep = 0;
    card.interval = 1;
  }

  // EF 조정
  card.ef = card.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (card.ef < 1.3) card.ef = 1.3;

  card.due = addDays(today(), card.interval);
  state[word] = card;
  store.write(SRS_FILE, state);
  return card;
}

function getDueCards() {
  const state = getState();
  const t = today();
  return Object.values(state).filter(c => c.due <= t);
}

function getStats() {
  const state = getState();
  const cards = Object.values(state);
  const t = today();
  return {
    total: cards.length,
    due: cards.filter(c => c.due <= t).length,
    mastered: cards.filter(c => c.interval >= 21).length,
    learning: cards.filter(c => c.interval > 0 && c.interval < 21).length,
    new: cards.filter(c => c.interval === 0).length,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = { answer, getDueCards, getStats, getCard };
