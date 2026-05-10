import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWN_FILE = join(__dirname, '..', 'known-listings.json');

const EXCHANGES = [
  {
    name: 'Binance',
    url: 'https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT',
    parse: (d) => {
      if (!d?.symbols) return [];
      return d.symbols.filter(s => s.status === 'TRADING').map(s => `${s.baseAsset}/${s.quoteAsset}`);
    },
  },
  {
    name: 'Bybit',
    url: 'https://api.bybit.com/v5/market/instruments-info?category=spot',
    parse: (d) => {
      if (!d?.result?.list) return [];
      return d.result.list.filter(s => s.status === 'Trading').map(s => `${s.baseCoin}/${s.quoteCoin}`);
    },
  },
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/coins/list',
    parse: (d) => {
      if (!Array.isArray(d)) return [];
      return d.map(c => c.id);
    },
  },
];

const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHANNEL_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

async function fetchPairs(exchange) {
  try {
    const res = await fetch(exchange.url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    const data = JSON.parse(text);
    const pairs = exchange.parse(data);
    console.log(`  ${exchange.name}: ${pairs.length} pairs`);
    return { name: exchange.name, pairs };
  } catch (e) {
    console.log(`  ${exchange.name}: ⚠️ ${e.message}`);
    return { name: exchange.name, pairs: [] };
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

function buildKey(pair) {
  return `${pair.name}:${pair.pair}`;
}

async function sendAlert(name, pair) {
  const msg = `🚀 *NEW LISTING* on ${name}\n\n${pair}\n\nTrade: https://www.bybit.com/invite?ref=N1PKV`;

  if (TELEGRAM_BOT && TELEGRAM_CHAT) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg, parse_mode: 'Markdown' }),
      });
      console.log(`  📨 Telegram alert for ${pair}`);
    } catch (e) {
      console.log(`  ❌ Telegram error: ${e.message}`);
    }
  }

  if (DISCORD_WEBHOOK) {
    try {
      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg }),
      });
      console.log(`  📨 Discord alert for ${pair}`);
    } catch (e) {
      console.log(`  ❌ Discord error: ${e.message}`);
    }
  }
}

async function main() {
  console.log('');
  console.log('=== Listing Monitor ===');
  console.log(`[${new Date().toISOString()}]`);

  const results = await Promise.all(EXCHANGES.map(fetchPairs));

  const known = loadKnown();
  const isFirstRun = Object.keys(known).length === 0;

  const allNew = [];
  for (const r of results) {
    const knownPairs = known[r.name] || [];
    const knownSet = new Set(knownPairs);

    const newPairs = r.pairs.filter(p => !knownSet.has(p));
    for (const p of newPairs) {
      knownPairs.push(p);
      allNew.push({ name: r.name, pair: p });
    }
    known[r.name] = knownPairs;
  }

  if (isFirstRun) {
    const total = Object.values(known).reduce((a, b) => a + b.length, 0);
    console.log(`\n📦 First run — saved ${total} entries as baseline. No alerts.`);
    saveKnown(known);
    return;
  }

  if (allNew.length === 0) {
    console.log('\nNo new listings found.');
    saveKnown(known);
    return;
  }

  console.log(`\n🎯 ${allNew.length} NEW ITEM(S)!`);
  for (const item of allNew) {
    console.log(`  -> ${item.name}: ${item.pair}`);
  }

  for (const item of allNew) {
    await sendAlert(item.name, item.pair);
  }

  saveKnown(known);
  console.log('\nKnown entries updated.');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
