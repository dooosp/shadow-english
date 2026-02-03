const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');

function parseVideoId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function checkYtdlp() {
  try {
    execSync('yt-dlp --version', { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

function extract(url) {
  const videoId = parseVideoId(url);
  if (!videoId) throw new Error('유효하지 않은 YouTube URL');
  if (!checkYtdlp()) throw new Error('yt-dlp가 설치되지 않았습니다. pip install yt-dlp');

  const outDir = config.VIDEOS_DIR;
  fs.mkdirSync(outDir, { recursive: true });

  const vttPath = path.join(outDir, `${videoId}.en.vtt`);
  if (fs.existsSync(vttPath)) return { videoId, vttPath };

  const cmd = [
    'yt-dlp',
    '--write-sub --write-auto-sub',
    '--sub-lang en --sub-format vtt',
    '--skip-download',
    `-o "${path.join(outDir, videoId)}"`,
    `"${url}"`
  ].join(' ');

  execSync(cmd, { stdio: 'pipe', timeout: 30000 });

  // yt-dlp 출력 파일명 패턴 매칭
  const files = fs.readdirSync(outDir);
  const vtt = files.find(f => f.startsWith(videoId) && f.endsWith('.vtt'));
  if (!vtt) throw new Error('영어 자막이 없는 영상입니다');

  const actual = path.join(outDir, vtt);
  if (actual !== vttPath) fs.renameSync(actual, vttPath);

  return { videoId, vttPath };
}

module.exports = { extract, parseVideoId, checkYtdlp };
