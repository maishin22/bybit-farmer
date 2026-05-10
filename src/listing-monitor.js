
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWN_FILE = join(__dirname, '..', 'known-listings.json');

const BINANCE_API = 'https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT';
const BYBIT_API = 'https://api.bybit.com/v5/market/instruments-info?category=spot';
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHANNEL_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

async function fetchAPI(url, transform) {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(30000) });
    const text = await res.text();
    const data = JSON.parse(text);
    return transform(data);
  } catch (e) {
    console.error(`  ⚠️  API error (${url.slice(0, 40)}...): ${e.message}`);
    return [];
  }
}

function binanceTransform(data) {
  if (!data || !Array.isArray(data.symbols)) return [];
  return data.symbols
    .filter(s => s.status === 'TRADING')
    .map(s => ({ exchange: 'Binance', symbol: `${s.baseAsset}/${s.quoteAsset}`, base: s.baseAsset, quote: s.quoteAsset }));
}

function bybitTransform(data) {
  if (!data || !data.result || !Array.isArray(data.result.list)) return [];
  return data.result.list
    .filter(s => s.status === 'Trading')
    .map(s => ({ exchange: 'Bybit', symbol: `${s.baseCoin}/${s.quoteCoin}`, base: s.baseCoin, quote: s.quoteCoin }));
}

const fetchBinanceListings = () => fetchAPI(BINANCE_API, binanceTransform);
const fetchBybitListings = () => fetchAPI(BYBIT_API, bybitTransform);

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

  const isFirstRun = known.binance.length === 0 && known.bybit.length === 0;
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

  if (isFirstRun) {
    console.log(`\n📦 First run — saved ${known.binance.length + known.bybit.length} pairs as baseline. No alerts sent.`);
    saveKnown(known);
    return;
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
