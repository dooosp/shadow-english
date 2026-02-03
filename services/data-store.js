const fs = require('fs');
const path = require('path');
const config = require('../config');

const cache = new Map();

function filePath(name) {
  return path.join(config.DATA_DIR, name);
}

function read(name, fallback = null) {
  if (cache.has(name)) return cache.get(name);
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return fallback;
  const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  cache.set(name, data);
  return data;
}

function write(name, data) {
  const fp = filePath(name);
  const tmp = fp + '.tmp';
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, fp);
  cache.set(name, data);
}

function update(name, fn, fallback) {
  const data = read(name, fallback);
  const updated = fn(data);
  write(name, updated);
  return updated;
}

module.exports = { read, write, update };
