import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = join(__dirname, '..', 'posts');
const KNOWN_FILE = join(__dirname, '..', 'known-listings.json');
const NEW_LISTINGS_FILE = join(__dirname, '..', 'docs', 'new-listings.json');

if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function getDateTag() {
  return new Date().toISOString().slice(0, 10);
}

function allPairsFromKnown(known) {
  const pairs = [];
  for (const exchange of Object.keys(known)) {
    for (const pair of known[exchange]) {
      if (pair.endsWith('/USDT')) pairs.push({ exchange, pair });
    }
  }
  return pairs;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const NEW_LISTING_TEMPLATES = [
  `🚀 {emoji} NEW LISTING on {exchange}\n\n{pair} is now available for trading!\n\nTrack all new listings in real-time and trade with up to 100x leverage on Bybit.`,
  `{emoji} HOT LISTING ALERT\n\n{pair} just got listed on {exchange}!\n\nNew listings often see high volatility. Stay ahead of the market.`,
  `{emoji} FRESH LISTING: {pair}\n\nExchange: {exchange}\n\nKeep an eye on this one — new pairs tend to move fast in the first hours.\n\nAlways DYOR.`,
];

const SIGNAL_TEMPLATES = [
  `{emoji} {pair} WATCH\n\n{pair} is showing increased volume across {exchange}.\n\nKey levels to watch:\n• Support: {level1}\n• Resistance: {level2}\n\nNot financial advice.`,
  `{emoji} {pair} ANALYSIS\n\n{pair} has been actively traded on {exchange} since listing.\n\nVolume trend: {direction}\n\nKeep it on your watchlist.`,
  `{emoji} TREND WATCH: {pair}\n\nListed on {exchange}. Volume picking up.\n\nNext resistance: {target}\n\nStay sharp.`,
];

const STATS_TEMPLATES = [
  `📊 {emoji} Exchange Stats\n\n{stats}\n\nTrack all listings in real-time on our site.\n\nTrade the latest pairs on Bybit:`,
  `{emoji} Market Pulse\n\nNew listings this run: {new_count}\n\n{stats}\n\nStay ahead of the market.`,
  `📈 {emoji} Listing Overview\n\n{stats}\n\nNew pairs appear every day. Don't miss the next gem.`,
];

const EDUCATION_TEMPLATES = [
  `{emoji} What is a Stop Loss?\n\nA stop loss is an order that closes your trade automatically when price hits a certain level. It protects your capital.\n\nWithout it — you risk losing everything in one bad move.\n\n👉 Always use a stop loss. Always.`,
  `{emoji} Leverage Explained Simply:\n\n• 1x = no leverage\n• 10x = position ×10\n• 50x = position ×50\n• 100x = almost guaranteed liquidation\n\nStart with 2-5x. Don't learn this lesson the hard way.`,
  `{emoji} FOMO is Your Worst Enemy\n\nYou see a coin pumping 50% in an hour. You buy the top. It dumps.\n\nThat's FOMO.\n\nSolution: have a plan. Wait for YOUR entry. Don't chase green candles.`,
  `{emoji} Mistake #1 Beginners Make:\n\nThey buy the pump.\n\nBy the time you see +30%, smart money is already taking profits.\n\nBuy the fear, sell the greed.`,
  `{emoji} Limit Order vs Market Order\n\n• Market order = buy NOW at any price\n• Limit order = buy at YOUR price\n\nLimit orders save you money. Use them whenever you can.`,
  `{emoji} Tip of the day:\n\nDon't trade the first 30 minutes after major news.\n\nLet the market settle. The initial reaction is often fake.`,
  `{emoji} Tip of the day:\n\nWrite down every trade.\n\nNo journal = no learning. You're not trading, you're guessing.`,
  `{emoji} Tip of the day:\n\nRisk 1-2% per trade.\n\nEven after 10 losses in a row, you're still in the game. Blow up your account? You're out.`,
  `{emoji} Tip of the day:\n\nTrend is your friend.\n\n4H chart = direction. 15M chart = entry.\n\nTrade with the trend, not against it.`,
  `{emoji} Every pro trader was once a beginner.\n\nThey lost. They learned. They adapted.\n\nThe difference? They didn't quit.\n\nKeep going. 💪`,
  `{emoji} You don't need to catch every move.\n\nYou just need to catch YOUR move.\n\nPatience is profit.`,
  `{emoji} The market rewards discipline, not desperation.\n\nStick to your strategy. Skip the trades that don't fit.`,
  `{emoji} Me: I'll just check the charts real quick\n\n*3 hours later*\n\nAlso me: how did I end up with 5 open positions at 3am`,
  `{emoji} Buy high, sell low.\n\nThis is the way.\n\n(Sarcasm. Please don't actually do this.)`,
  `{emoji} Crypto trading in one sentence:\n\n"Buy the dip" they said.\n\n"It'll go up" they said.\n\n*it went down*\n\n"Just HODL" they said.`,
];

function buildStats(known) {
  const lines = [];
  for (const [ex, pairs] of Object.entries(known)) {
    const exName = capitalize(ex);
    const usdtCount = pairs.filter(p => p.endsWith('/USDT')).length;
    const total = pairs.length;
    if (total > 0) lines.push(`• ${exName}: ${usdtCount} USDT pairs (${total} total)`);
  }
  return lines.join('\n');
}

const REFS = [
  { name: 'Bybit', url: 'https://www.bybit.com/invite?ref=N1PKV' },
  { name: 'Binance', url: 'https://www.binance.com/register?ref=36152696' },
];

export function generatePost() {
  const known = loadJson(KNOWN_FILE);
  const newListings = loadJson(NEW_LISTINGS_FILE);

  const ref = pick(REFS);
  const refFmt = `\n\nTrade on ${ref.name}: ${ref.url}`;
  const subscribe = pick([
    `👉 @maishin2 — daily listings & trading content`,
    `📢 Telegram: @maishin2`,
    `🔥 Real-time new listings tracker`,
  ]);

  let body, type;

  if (newListings && newListings.length > 0) {
    const item = pick(newListings);
    const emoji = pick(['🚀', '🔥', '⚡', '💎', '🎯']);
    body = pick(NEW_LISTING_TEMPLATES)
      .replace(/{emoji}/g, emoji)
      .replace(/{exchange}/g, item.exchange)
      .replace(/{pair}/g, item.pair);
    type = 'new_listing';
  } else if (known && Math.random() < 0.5) {
    const pairs = allPairsFromKnown(known);
    if (pairs.length > 0) {
      const realPair = pick(pairs);
      const emoji = pick(['📊', '📈', '🔍', '💡', '⚡']);
      const direction = pick(['increasing', 'steady', 'showing activity', 'growing']);
      const level1 = randFloat(0.01, 500);
      const level2 = (parseFloat(level1) * randFloat(1.05, 2.5)).toFixed(2);
      const target = randFloat(1, 1000);

      body = pick(SIGNAL_TEMPLATES)
        .replace(/{emoji}/g, emoji)
        .replace(/{pair}/g, realPair.pair)
        .replace(/{exchange}/g, realPair.exchange)
        .replace(/{direction}/g, direction)
        .replace(/{level1}/g, level1)
        .replace(/{level2}/g, level2)
        .replace(/{target}/g, target);
      type = 'signal';
    } else {
      body = pick(EDUCATION_TEMPLATES).replace(/{emoji}/g, pick(['💡', '📚', '🧠', '🎓']));
      type = 'education';
    }
  } else {
    const stats = known ? buildStats(known) : '';
    const newCount = newListings ? newListings.length : 0;
    if (stats && Math.random() < 0.5) {
      const emoji = pick(['📊', '📈', '🌍', '🔍']);
      body = pick(STATS_TEMPLATES)
        .replace(/{emoji}/g, emoji)
        .replace(/{stats}/g, stats)
        .replace(/{new_count}/g, newCount);
      type = 'stats';
    } else {
      body = pick(EDUCATION_TEMPLATES).replace(/{emoji}/g, pick(['💡', '📚', '🧠', '🎓', '💪', '😂', '💀']));
      type = 'education';
    }
  }

  const hashtags = ['#crypto', '#trading', '#Bybit', '#altcoins', '#listings', '#cryptotrading']
    .sort(() => Math.random() - 0.5).slice(0, 3).join(' ');

  const footer = `${subscribe}\n\nNot financial advice. DYOR.`;
  const post = `${body}${refFmt}\n\n${hashtags}\n\n${footer}`;

  const logEntry = `[${new Date().toISOString()}] [${type}]\n${post}\n${'='.repeat(50)}\n\n`;
  writeFileSync(join(POSTS_DIR, `posts_${getDateTag()}.log`), logEntry, { flag: 'a' });

  return { type, text: post };
}

export function generateBatch(count, refLink) {
  const posts = [];
  for (let i = 0; i < count; i++) posts.push(generatePost(refLink));
  return posts;
}
