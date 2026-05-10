import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWN_FILE = join(__dirname, '..', 'known-listings.json');

const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHANNEL_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

const SOURCES = [
  {
    id: 'Binance',
    url: 'https://api-gcp.binance.com/api/v3/exchangeInfo?permissions=SPOT',
    timeout: 15000,
    parse: (d) => {
      if (!d?.symbols) {
        console.log(`    debug: keys=${Object.keys(d||{}).slice(0,5)} type=${typeof d}`);
        return [];
      }
      return d.symbols.filter(s => s.status === 'TRADING').map(s => `${s.baseAsset}/${s.quoteAsset}`);
    },
  },
  {
    id: 'Bybit',
    url: 'https://api.bybit.com/v5/market/instruments-info?category=spot',
    timeout: 10000,
    parse: (d) => {
      if (!d?.result?.list) {
        console.log(`    debug: keys=${Object.keys(d||{}).slice(0,5)}`);
        return [];
      }
      return d.result.list.filter(s => s.status === 'Trading').map(s => `${s.baseCoin}/${s.quoteCoin}`);
    },
  },
];

async function fetchOne(source) {
  try {
    const res = await fetch(source.url, { headers: HEADERS, signal: AbortSignal.timeout(source.timeout) });
    const text = await res.text();
    const data = JSON.parse(text);
    const items = source.parse(data);
    console.log(`  ${source.id}: ${items.length} items`);
    return { id: source.id, items };
  } catch (e) {
    console.log(`  ${source.id}: ⚠️ ${e.message}`);
    return { id: source.id, items: [] };
  }
}

function loadKnown() {
  try {
    return JSON.parse(readFileSync(KNOWN_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveKnown(data) {
  writeFileSync(KNOWN_FILE, JSON.stringify(data, null, 2));
}

async function sendAlerts(items) {
  const promises = [];
  for (const { id, pair } of items) {
    const msg = `🚀 *NEW LISTING* on ${id}\n\n${pair}\n\nTrade: https://www.bybit.com/invite?ref=N1PKV`;

    if (TELEGRAM_BOT && TELEGRAM_CHAT) {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`;
      promises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg, parse_mode: 'Markdown' }),
        }).then(() => console.log(`  📨 TG: ${pair}`)).catch(e => console.log(`  ❌ TG: ${e.message}`))
      );
    }
    if (DISCORD_WEBHOOK) {
      promises.push(
        fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: msg }),
        }).then(() => console.log(`  📨 DC: ${pair}`)).catch(e => console.log(`  ❌ DC: ${e.message}`))
      );
    }
  }
  await Promise.all(promises);
}

async function main() {
  console.log('');
  console.log('=== Listing Monitor ===');
  console.log(`[${new Date().toISOString()}]`);

  const results = await Promise.allSettled(SOURCES.map(fetchOne));

  const known = loadKnown();
  const isFirstRun = Object.keys(known).length === 0;
  const allNew = [];

  for (const r of results) {
    if (r.status === 'rejected') continue;
    const { id, items } = r.value;
    if (items.length === 0) continue;

    const knownItems = known[id] || [];
    const knownSet = new Set(knownItems);
    const isSourceFirstRun = knownItems.length === 0;

    const newItems = items.filter(p => !knownSet.has(p));
    if (isSourceFirstRun) {
      console.log(`  ${id}: first run — saving ${newItems.length} as baseline`);
      newItems.forEach(p => knownSet.add(p));
    } else {
      for (const p of newItems) {
        knownSet.add(p);
        allNew.push({ id, pair: p });
      }
    }
    known[id] = [...knownSet].sort();
  }

  if (isFirstRun) {
    const total = Object.values(known).reduce((a, b) => a + b.length, 0);
    console.log(`\n📦 First run — saved ${total} entries as baseline.`);
  } else if (allNew.length === 0) {
    console.log('\nNo new listings found.');
  } else {
    console.log(`\n🎯 ${allNew.length} NEW!`);
    for (const item of allNew) {
      console.log(`  -> ${item.id}: ${item.pair}`);
    }
    console.log('\nSending alerts...');
    await sendAlerts(allNew);
  }

  saveKnown(known);
  console.log('\nDone.');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
