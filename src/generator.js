import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = join(__dirname, '..', 'posts');

if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });

const TYPES = ['signal', 'education', 'news', 'tip', 'motivation', 'humor'];

const EMOJIS = {
  signal: ['📈', '🔥', '⚡', '🎯', '💰'],
  education: ['🧠', '📚', '💡', '🎓', '🤔'],
  news: ['📰', '🌍', '🚨', '📊', '🔍'],
  tip: ['💎', '🛡️', '⚙️', '🎯', '✅'],
  motivation: ['💪', '🔥', '🚀', '👑', '⭐'],
  humor: ['😂', '💀', '😭', '🤡', '🙃'],
};

const TEMPLATES = {
  signal: [
    `{emoji} SIGNAL: {pair}\n\n{pair} showing strong {direction} momentum on the 1H.\nVolume is picking up. Next target: {target}\n\nKeep your stop loss tight. Risk first.`,
    `{emoji} BREAKOUT WATCH: {pair}\n\nJust broke above resistance at {level}.\nVolume confirmed. Next stop: {target}\n\nNot financial advice. Always DYOR.`,
    `{emoji} {pair} ANALYSIS:\n\nBullish divergence forming on RSI.\nLooking for a clean bounce from {level}.\n\nIf {pair2} follows, this could get interesting.`,
  ],

  education: [
    `{emoji} What is a Stop Loss?\n\nA stop loss is an order that closes your trade automatically when price hits a certain level. It protects your capital.\n\nWithout it — you risk losing everything in one bad move.\n\n👉 Always use a stop loss. Always.`,
    `{emoji} Leverage Explained Simply:\n\n• 1x = no leverage\n• 10x = position ×10\n• 50x = position ×50\n• 100x = almost guaranteed liquidation\n\nStart with 2-5x. Don't learn this lesson the hard way.`,
    `{emoji} FOMO is Your Worst Enemy\n\nYou see a coin pumping 50% in an hour. You buy the top. It dumps.\n\nThat's FOMO.\n\nSolution: have a plan. Wait for YOUR entry. Don't chase green candles.`,
    `{emoji} Mistake #1 Beginners Make:\n\nThey buy the pump.\n\nBy the time you see +30%, smart money is already taking profits.\n\nBuy the fear, sell the greed.`,
    `{emoji} Limit Order vs Market Order\n\n• Market order = buy NOW at any price\n• Limit order = buy at YOUR price\n\nLimit orders save you money. Use them whenever you can.`,
  ],

  news: [
    `{emoji} Bitcoin Dominance: {btc_d}%\n\nWhen BTC.D drops, money flows into altcoins.\n\nAlt season loading? Keep an eye on the chart.`,
    `{emoji} WHALES ON THE MOVE\n\nA large wallet just moved {amount} {coin} to an unknown address.\n\nBig transfers like this often come before big moves. Stay sharp.`,
    `{emoji} Open Interest Alert: {pair}\n\nOI just hit {oi} — that's elevated.\n\nHigh OI = big move incoming.\n\nDirection? Unknown. But volatility is coming.`,
  ],

  tip: [
    `{emoji} Tip of the day:\n\nDon't trade the first 30 minutes after major news.\n\nLet the market settle. The initial reaction is often fake.`,
    `{emoji} Tip of the day:\n\nWrite down every trade.\n\nNo journal = no learning. You're not trading, you're guessing.`,
    `{emoji} Tip of the day:\n\nRisk 1-2% per trade.\n\nEven after 10 losses in a row, you're still in the game. Blow up your account? You're out.`,
    `{emoji} Tip of the day:\n\nTrend is your friend.\n\n4H chart = direction. 15M chart = entry.\n\nTrade with the trend, not against it.`,
  ],

  motivation: [
    `{emoji} Every pro trader was once a beginner.\n\nThey lost. They learned. They adapted.\n\nThe difference? They didn't quit.\n\nKeep going. 💪`,
    `{emoji} You don't need to catch every move.\n\nYou just need to catch YOUR move.\n\nPatience is profit.`,
    `{emoji} The market rewards discipline, not desperation.\n\nStick to your strategy. Skip the trades that don't fit.`,
  ],

  humor: [
    `{emoji} Me: I'll just check the charts real quick\n\n*3 hours later*\n\nAlso me: how did I end up with 5 open positions at 3am`,
    `{emoji} Buy high, sell low.\n\nThis is the way.\n\n(Sarcasm. Please don't actually do this.)`,
    `{emoji} Crypto trading in one sentence:\n\n"Buy the dip" they said.\n\n"It'll go up" they said.\n\n*it went down*\n\n"Just HODL" they said.`,
    `{emoji} Why are you awake at 4am?\n— Watching liquidations.\n— Why?\n— Free entertainment.`,
  ],
};

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ARB/USDT', 'OP/USDT', 'LINK/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT'];
const DIRECTIONS = ['bullish', 'strong bullish', 'bearish', 'strong bearish'];
const COINS = ['BTC', 'ETH', 'SOL', 'ARB', 'OP', 'LINK', 'DOGE'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function randFloat(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function getDateTag() {
  return new Date().toISOString().slice(0, 10);
}

export function generatePost(refLink) {
  const type = pick(TYPES);
  const template = pick(TEMPLATES[type]);
  const emoji = pick(EMOJIS[type]);

  const pair = pick(PAIRS);
  const pair2 = pick(PAIRS.filter(p => p !== pair));
  const coin = pick(COINS);

  let body = template
    .replace(/{emoji}/g, emoji)
    .replace(/{pair}/g, pair)
    .replace(/{pair2}/g, pair2)
    .replace(/{direction}/g, pick(DIRECTIONS))
    .replace(/{level}/g, randFloat(100, 50000))
    .replace(/{target}/g, randFloat(100, 60000))
    .replace(/{btc_d}/g, randFloat(40, 62))
    .replace(/{amount}/g, randFloat(100, 50000) + 'M')
    .replace(/{coin}/g, coin)
    .replace(/{oi}/g, randFloat(0.5, 5) + 'B');

  const divider = '\n\n' + '—'.repeat(20) + '\n\n';

  const subscribe = pick([
    `👉 Follow for more: @maishin2`,
    `📢 More signals & analysis: @maishin2`,
    `🔥 Daily crypto content: @maishin2`,
    `⚡ Trading tips & signals: @maishin2`,
  ]);

  const ref = pick([
    `Trade on Bybit: ${refLink}`,
    `Open a Bybit account: ${refLink}`,
    `Trade with leverage on Bybit: ${refLink}`,
  ]);

  const footer = `${subscribe}\n\nNot financial advice. DYOR.\n${ref}`;

  const hashtags = ['#crypto', '#trading', '#Bybit', `#${type}`, '#BTC', '#cryptotrading']
    .sort(() => Math.random() - 0.5).slice(0, 3).join(' ');

  const post = `${body}${divider}${hashtags}\n\n${footer}`;

  const logEntry = `[${new Date().toISOString()}] [${type}]\n${post}\n${'='.repeat(50)}\n\n`;
  writeFileSync(join(POSTS_DIR, `posts_${getDateTag()}.log`), logEntry, { flag: 'a' });

  return { type, text: post };
}

export function generateBatch(count, refLink) {
  const posts = [];
  for (let i = 0; i < count; i++) {
    posts.push(generatePost(refLink));
  }
  return posts;
}
