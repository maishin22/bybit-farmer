import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWN_FILE = join(__dirname, '..', 'known-listings.json');

const BINANCE_API = 'https://api.binance.com/api/v3/exchangeInfo';
const BYBIT_API = 'https://api.bybit.com/v5/market/instruments-info?category=spot';

const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHANNEL_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

async function fetchBinanceListings() {
  const res = await fetch(BINANCE_API);
  const data = await res.json();
  if (!data || !Array.isArray(data.symbols)) {
    console.error('  ⚠️  Binance API returned unexpected format');
    return [];
  }
  const pairs = [];
  for (const s of data.symbols) {
    if (s.status === 'TRADING') {
      pairs.push({
        exchange: 'Binance',
        symbol: `${s.baseAsset}/${s.quoteAsset}`,
        base: s.baseAsset,
        quote: s.quoteAsset,
      });
    }
  }
  return pairs;
}

async function fetchBybitListings() {
  const res = await fetch(BYBIT_API);
  const data = await res.json();
  if (!data || !data.result || !Array.isArray(data.result.list)) {
    console.error('  ⚠️  Bybit API returned unexpected format');
    return [];
  }
  const pairs = [];
  for (const s of data.result.list) {
    if (s.status === 'Trading') {
      pairs.push({
        exchange: 'Bybit',
        symbol: `${s.baseCoin}/${s.quoteCoin}`,
        base: s.baseCoin,
        quote: s.quoteCoin,
      });
    }
  }
  return pairs;
}

function loadKnown() {
  try {
    return JSON.parse(readFileSync(KNOWN_FILE, 'utf-8'));
  } catch {
    return { binance: [], bybit: [] };
  }
}

function saveKnown(data) {
  writeFileSync(KNOWN_FILE, JSON.stringify(data, null, 2));
}

function buildKey(p) {
  return `${p.exchange}:${p.symbol}`;
}

async function sendAlert(pair) {
  const msg = `🚀 *NEW LISTING* on ${pair.exchange}\n\n${pair.symbol}\n\nTrade now: https://www.bybit.com/invite?ref=N1PKV`;

  if (TELEGRAM_BOT && TELEGRAM_CHAT) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg, parse_mode: 'Markdown' }),
      });
      console.log(`  📨 Telegram alert sent for ${pair.symbol}`);
    } catch (e) {
      console.log(`  ❌ Telegram alert error: ${e.message}`);
    }
  }

  if (DISCORD_WEBHOOK) {
    try {
      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg }),
      });
      console.log(`  📨 Discord alert sent for ${pair.symbol}`);
    } catch (e) {
      console.log(`  ❌ Discord alert error: ${e.message}`);
    }
  }
}

async function main() {
  console.log('');
  console.log('=== Listing Monitor ===');
  console.log(`[${new Date().toISOString()}]`);

  const [binance, bybit] = await Promise.all([
    fetchBinanceListings(),
    fetchBybitListings(),
  ]);
  console.log(`\nBinance: ${binance.length} pairs`);
  console.log(`Bybit: ${bybit.length} pairs`);

  const known = loadKnown();
  const knownSet = new Set(known.binance.concat(known.bybit));

  const newPairs = [];
  for (const p of binance) {
    const key = buildKey(p);
    if (!knownSet.has(key)) {
      known.binance.push(key);
      newPairs.push(p);
    }
  }
  for (const p of bybit) {
    const key = buildKey(p);
    if (!knownSet.has(key)) {
      known.bybit.push(key);
      newPairs.push(p);
    }
  }

  if (newPairs.length === 0) {
    console.log('\nNo new listings found.');
    saveKnown(known);
    return;
  }

  console.log(`\n🎯 ${newPairs.length} NEW LISTING(S) FOUND!`);
  for (const p of newPairs) {
    console.log(`  -> ${p.exchange}: ${p.symbol}`);
  }

  for (const p of newPairs) {
    await sendAlert(p);
  }

  saveKnown(known);
  console.log('\nKnown listings updated.');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
