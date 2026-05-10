import { postOnce } from './index.js';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function runSchedule() {
  log('=== Bybit Affiliate Scheduler STARTED ===');
  log('Posts every 2-6 hours with randomized timing');
  log('Press Ctrl+C to stop\n');

  // first post immediately
  log('First post...');
  await postOnce();

  while (true) {
    const hours = rand(2, 6);
    const mins = rand(0, 59);
    const totalMs = (hours * 3600 + mins * 60) * 1000;
    const nextTime = new Date(Date.now() + totalMs);

    log(`Next post in ${hours}h ${mins}m (≈ ${nextTime.toLocaleTimeString()})`);
    await sleep(totalMs);

    log('Posting...');
    await postOnce();
  }
}

runSchedule().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
