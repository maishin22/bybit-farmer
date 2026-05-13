import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWN_FILE = join(__dirname, '..', 'known-listings.json');
const DOCS_DIR = join(__dirname, '..', 'docs');
const NEW_LISTINGS_FILE = join(DOCS_DIR, 'new-listings.json');
const INDEX_HTML = join(DOCS_DIR, 'index.html');

const POSTS_DIR = join(__dirname, '..', 'docs', 'posts');
const BLOG_DATA_FILE = join(DOCS_DIR, 'blog-posts.json');

const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHANNEL_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const BYBIT_REF = 'https://www.bybit.com/invite?ref=N1PKV';
const BINANCE_REF = 'https://www.binance.com/register?ref=36152696';

const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

const SOURCES = [
  {
    id: 'Binance',
    url: 'https://api-gcp.binance.com/api/v3/exchangeInfo?permissions=SPOT',
    timeout: 15000,
    parse: (d) => {
      if (!d?.symbols) return [];
      return d.symbols.filter(s => s.status === 'TRADING').map(s => `${s.baseAsset}/${s.quoteAsset}`);
    },
  },
  {
    id: 'Bybit',
    url: 'https://api.bybit.com/v5/market/instruments-info?category=spot',
    timeout: 10000,
    parse: (d) => {
      if (!d?.result?.list) return [];
      return d.result.list.filter(s => s.status === 'Trading').map(s => `${s.baseCoin}/${s.quoteCoin}`);
    },
  },
  {
    id: 'KuCoin',
    url: 'https://api.kucoin.com/api/v1/symbols',
    timeout: 10000,
    parse: (d) => {
      if (!d?.data) return [];
      return d.data.filter(s => s.enableTrading).map(s => s.symbol.replace('-', '/'));
    },
  },
  {
    id: 'OKX',
    url: 'https://www.okx.com/api/v5/public/instruments?instType=SPOT',
    timeout: 10000,
    parse: (d) => {
      if (!d?.data) return [];
      return d.data.filter(s => s.state === 'live').map(s => s.instId.replace('-', '/'));
    },
  },
  {
    id: 'MEXC',
    url: 'https://api.mexc.com/api/v3/exchangeInfo',
    timeout: 10000,
    parse: (d) => {
      if (!d?.symbols) return [];
      return d.symbols.filter(s => s.status === '1').map(s => `${s.baseAsset}/${s.quoteAsset}`);
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

function loadNewListings() {
  try {
    return JSON.parse(readFileSync(NEW_LISTINGS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveNewListings(list) {
  if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });
  writeFileSync(NEW_LISTINGS_FILE, JSON.stringify(list, null, 2));
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function countExchangePairs(known) {
  const counts = {};
  for (const [ex, pairs] of Object.entries(known)) {
    if (Array.isArray(pairs)) counts[ex] = pairs.length;
  }
  return counts;
}

function coinFromPair(pair) {
  return pair.replace('/USDT', '').replace('/USDC', '').replace('/BTC', '').replace('/ETH', '').replace('/TRY', '');
}

function generateBlogPost(item) {
  const date = new Date(item.found_at);
  const dateStr = date.toISOString().slice(0, 10);
  const slug = `${item.exchange.toLowerCase()}-${coinFromPair(item.pair).toLowerCase().replace(/[^a-z0-9]/g, '')}-listing`;
  const siteUrl = 'https://maishin22.github.io/bybit-farmer/';
  const coin = coinFromPair(item.pair);

  const descs = [
    `${item.pair} has just been listed on ${item.exchange}. Track all new crypto listings in real time and trade with leverage on Bybit and Binance.`,
    `A new trading pair ${item.pair} is now available on ${item.exchange}. Stay ahead of the market with our real-time listing tracker.`,
    `${item.exchange} has added ${item.pair} to its spot market. New listings often bring volatility and trading opportunities.`,
  ];
  const description = descs[Math.floor(Math.random() * descs.length)];

  const paragraphs = [
    `<p>${item.exchange} has just listed <strong>${item.pair}</strong> on its spot market. This new trading pair gives traders access to ${coin} with USDT pairs and more.</p>`,
    `<p>New listings on major exchanges like ${item.exchange} often generate significant interest from the trading community. Historically, newly listed pairs can experience increased volatility and trading volume in their first days.</p>`,
    `<p>Whether you are looking to trade ${coin} or simply diversify your portfolio, keeping track of new listings helps you stay informed about market opportunities.</p>`,
    `<h2>How to Trade ${item.pair}</h2>`,
    `<p>Most major exchanges support USDT trading pairs. To trade <strong>${item.pair}</strong>:</p>`,
    `<ul><li>Create an account on Bybit or Binance</li><li>Deposit USDT or other supported assets</li><li>Search for ${item.pair} in the spot market</li><li>Place your trade with market or limit orders</li></ul>`,
    `<h2>Track All New Listings</h2>`,
    `<p>Bookmark our <a href="${siteUrl}">new crypto listings tracker</a> for real-time updates across Binance, Bybit, KuCoin, OKX, and MEXC.</p>`,
  ];

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${item.exchange} Lists ${item.pair} — New Crypto Listing</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${siteUrl}posts/${slug}.html" />
  <meta property="og:title" content="New Listing on ${item.exchange}: ${item.pair}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${siteUrl}posts/${slug}.html" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="New Listing on ${item.exchange}: ${item.pair}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "New Listing on ${item.exchange}: ${item.pair}",
    "description": "${escapeHtml(description)}",
    "datePublished": "${dateStr}",
    "publisher": { "@type": "Organization", "name": "New Crypto Listings Tracker" },
    "mainEntityOfPage": { "@type": "WebPage", "@id": "${siteUrl}posts/${slug}.html" }
  }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0e17; color: #e0e6ed; min-height: 100vh; }
    .container { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 16px; background: linear-gradient(135deg, #f7931a, #6c8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
    p { line-height: 1.7; margin-bottom: 16px; color: #d1d5db; }
    h2 { font-size: 20px; font-weight: 700; margin: 24px 0 12px; color: #f7931a; }
    ul { margin: 0 0 16px 24px; color: #d1d5db; line-height: 1.8; }
    .cta-box { background: linear-gradient(135deg, #1a2332, #0f1729); border: 1px solid #f7931a40; border-radius: 12px; padding: 24px; margin: 32px 0; text-align: center; }
    .cta-box h2 { margin-top: 0; }
    .cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .cta-btn { display: inline-block; font-weight: 700; font-size: 16px; padding: 14px 36px; border-radius: 8px; text-decoration: none; transition: opacity 0.2s; flex: 1; min-width: 200px; }
    .cta-btn:hover { opacity: 0.85; }
    .cta-btn.bybit { background: #f7931a; color: #0a0e17; }
    .cta-btn.binance { background: #f0b90b; color: #0a0e17; }
    .back { display: inline-block; margin-bottom: 24px; color: #6c8cff; text-decoration: none; font-size: 14px; }
    .footer { margin-top: 48px; text-align: center; color: #4b5563; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <a class="back" href="${siteUrl}">← Back to tracker</a>
    <h1>New Listing on ${item.exchange}: ${item.pair}</h1>
    <div class="meta">${dateStr} · ${item.exchange} · New Listing</div>
    ${paragraphs.join('\n    ')}
    <div class="cta-box">
      <h2>Trade ${item.pair}</h2>
      <p>Sign up on a top exchange and start trading</p>
      <div class="cta-row">
        <a class="cta-btn bybit" href="${BYBIT_REF}" target="_blank">Trade on Bybit →</a>
        <a class="cta-btn binance" href="${BINANCE_REF}" target="_blank">Trade on Binance →</a>
      </div>
    </div>
    <div class="footer">
      <p>Not financial advice. DYOR.</p>
      <p><a href="${siteUrl}">New Crypto Listings Tracker</a></p>
    </div>
  </div>
</body>
</html>`;

  return { slug, html, title: `New Listing on ${item.exchange}: ${item.pair}`, date: dateStr };
}

function loadBlogPosts() {
  try { return JSON.parse(readFileSync(BLOG_DATA_FILE, 'utf-8')); } catch { return []; }
}

function saveBlogPosts(list) {
  if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });
  writeFileSync(BLOG_DATA_FILE, JSON.stringify(list, null, 2));
}

function generateHtml(allNew, newListings, known, blogPosts) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const siteUrl = 'https://maishin22.github.io/bybit-farmer/';

  const rows = newListings.slice(0, 50).map(item => {
    const found = item.found_at.replace('T', ' ').slice(0, 19);
    return `<tr>
      <td class="exch">${escapeHtml(item.exchange)}</td>
      <td class="pair">${escapeHtml(item.pair)}</td>
      <td class="date">${found}</td>
      <td><a class="trade-btn" href="${BYBIT_REF}" target="_blank">Trade</a></td>
    </tr>`;
  }).join('\n');

  const count = newListings.length;
  const exCounts = known ? countExchangePairs(known) : {};
  const totalPairs = Object.values(exCounts).reduce((a, b) => a + b, 0);
  const trackedExchanges = Object.keys(exCounts).length;

  const statsRows = Object.entries(exCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([ex, n]) => `<div class="stat-item"><span class="stat-ex">${escapeHtml(ex)}</span><span class="stat-num">${n} pairs</span></div>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Crypto Listings Tracker — Binance, Bybit, KuCoin, OKX, MEXC</title>
  <meta name="description" content="Real-time new cryptocurrency listings across Binance, Bybit, KuCoin, OKX, and MEXC. Track newly listed pairs the moment they appear." />
  <meta name="keywords" content="new crypto listings, binance new listing, bybit new listing, kucoin listing, okx listing, mexc listing, crypto pairs tracker" />
  <meta name="google-site-verification" content="HBMXZCYu6enJkSNX3KdBAyqje2dGDZCoTRaQ_kl7Zas" />
  <link rel="canonical" href="${siteUrl}" />
  <meta property="og:title" content="New Crypto Listings Tracker — 5 Major Exchanges" />
  <meta property="og:description" content="Real-time tracking of new cryptocurrency pairs on Binance, Bybit, KuCoin, OKX, and MEXC. ${totalPairs} pairs monitored." />
  <meta property="og:url" content="${siteUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="New Crypto Listings Tracker" />
  <meta name="twitter:description" content="Real-time new crypto listings across 5 major exchanges." />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "New Crypto Listings Tracker",
    "url": "${siteUrl}",
    "description": "Real-time tracker of new cryptocurrency listings on Binance, Bybit, KuCoin, OKX, and MEXC.",
    "about": {
      "@type": "Thing",
      "name": "Cryptocurrency Listings"
    }
  }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e17;
      color: #e0e6ed;
      min-height: 100vh;
    }
    .container { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    h1 {
      font-size: 28px; font-weight: 800; margin-bottom: 8px;
      background: linear-gradient(135deg, #f7931a, #6c8cff);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
    .cta-box {
      background: linear-gradient(135deg, #1a2332, #0f1729);
      border: 1px solid #f7931a40;
      border-radius: 12px; padding: 24px; margin-bottom: 32px;
      text-align: center;
    }
    .cta-box h2 { font-size: 20px; margin-bottom: 8px; color: #f7931a; }
    .cta-box p { color: #9ca3af; font-size: 14px; margin-bottom: 16px; }
    .cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .cta-btn {
      display: inline-block; font-weight: 700; font-size: 16px; padding: 14px 36px;
      border-radius: 8px; text-decoration: none; transition: opacity 0.2s; flex: 1; min-width: 200px;
    }
    .cta-btn:hover { opacity: 0.85; }
    .cta-btn.bybit { background: #f7931a; color: #0a0e17; }
    .cta-btn.binance { background: #f0b90b; color: #0a0e17; }
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px; margin-bottom: 32px;
    }
    .stat-item {
      background: #111927; border: 1px solid #1f2937;
      border-radius: 8px; padding: 16px; text-align: center;
    }
    .stat-ex { display: block; font-size: 13px; color: #f7931a; font-weight: 600; margin-bottom: 4px; }
    .stat-num { display: block; font-size: 18px; font-weight: 700; color: #e0e6ed; }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left; padding: 12px 8px; font-size: 12px; text-transform: uppercase;
      color: #6b7280; letter-spacing: 1px; border-bottom: 1px solid #1f2937;
    }
    td { padding: 12px 8px; border-bottom: 1px solid #1f2937; font-size: 14px; }
    .exch { color: #f7931a; font-weight: 600; }
    .pair { font-family: 'SF Mono', 'Fira Code', monospace; font-weight: 500; }
    .date { color: #6b7280; font-size: 13px; }
    .trade-btn {
      display: inline-block; background: #f7931a; color: #0a0e17;
      font-weight: 600; font-size: 12px; padding: 4px 14px; border-radius: 4px;
      text-decoration: none;
    }
    .trade-btn:hover { opacity: 0.8; }
    .section-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
    .blog-section { margin-bottom: 32px; }
    .blog-card {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: #111927; border: 1px solid #1f2937; border-radius: 8px;
      text-decoration: none; margin-bottom: 8px; transition: border-color 0.2s;
    }
    .blog-card:hover { border-color: #f7931a40; }
    .blog-exch { font-size: 11px; font-weight: 600; color: #f7931a; background: #1a2332; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
    .blog-title { flex: 1; font-size: 14px; color: #e0e6ed; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .blog-date { font-size: 12px; color: #6b7280; white-space: nowrap; }
    .empty {
      text-align: center; padding: 48px 0; color: #6b7280; font-size: 16px;
    }
    .footer {
      margin-top: 48px; text-align: center; color: #4b5563; font-size: 12px;
    }
    .footer a { color: #6c8cff; text-decoration: none; }
    .badge {
      display: inline-block; background: #1f2937; color: #9ca3af;
      font-size: 12px; padding: 2px 10px; border-radius: 10px; margin-left: 8px;
    }
    @media (max-width: 600px) {
      h1 { font-size: 22px; }
      .cta-box { padding: 16px; }
      .cta-btn { display: block; text-align: center; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>New Crypto Listings</h1>
    <div class="subtitle">
      Tracking ${totalPairs} pairs across ${trackedExchanges} exchanges
      <span class="badge">${count} new listings</span>
    </div>

    <div class="stats-grid">
      ${statsRows}
    </div>

    <div class="cta-box">
      <h2>Trade on Top Exchanges</h2>
      <p>Sign up and get access to the latest crypto listings</p>
      <div class="cta-row">
        <a class="cta-btn bybit" href="${BYBIT_REF}" target="_blank">Trade on Bybit →</a>
        <a class="cta-btn binance" href="${BINANCE_REF}" target="_blank">Trade on Binance →</a>
      </div>
    </div>

    ${blogPosts && blogPosts.length > 0 ? `
    <div class="blog-section">
      <h2 class="section-title">Latest News</h2>
      ${blogPosts.slice(0, 10).map(p => `
      <a class="blog-card" href="posts/${p.slug}.html">
        <span class="blog-exch">${p.exchange}</span>
        <span class="blog-title">${escapeHtml(p.title)}</span>
        <span class="blog-date">${p.date}</span>
      </a>`).join('\n      ')}
    </div>` : ''}

    ${count === 0 ? '<div class="empty">No new listings detected yet. Check back soon.</div>' : `
    <table>
      <thead>
        <tr><th>Exchange</th><th>Pair</th><th>Found</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`}

    <div class="footer">
      <p>Last updated: ${now}</p>
      <p>Data refreshes every 5 minutes. Not financial advice. DYOR.</p>
      <p><a href="${BYBIT_REF}" target="_blank">Bybit</a> · <a href="${BINANCE_REF}" target="_blank">Binance</a></p>
    </div>
  </div>
</body>
</html>`;
}

async function sendAlerts(items) {
  const promises = [];
  const refs = [`Bybit: ${BYBIT_REF}`, `Binance: ${BINANCE_REF}`];
  for (const { id, pair } of items) {
    const msg = `🚀 *NEW LISTING* on ${id}\n\n${pair}\n\n${refs.join('\n')}`;

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

  if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });

  const newListings = loadNewListings();

  if (isFirstRun) {
    const total = Object.values(known).reduce((a, b) => a + b.length, 0);
    console.log(`\n📦 First run — saved ${total} entries as baseline.`);
  } else if (allNew.length > 0) {
    console.log(`\n🎯 ${allNew.length} NEW!`);
    for (const item of allNew) {
      console.log(`  -> ${item.id}: ${item.pair}`);
      newListings.unshift({ exchange: item.id, pair: item.pair, found_at: new Date().toISOString() });
    }
    console.log('\nGenerating blog posts...');
    const blogPosts = loadBlogPosts();
    for (const item of allNew) {
      const post = generateBlogPost(item);
      if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
      writeFileSync(join(POSTS_DIR, post.slug + '.html'), post.html);
      blogPosts.unshift({ slug: post.slug, title: post.title, date: post.date, exchange: item.exchange, pair: item.pair });
      console.log(`  📝 Blog: ${post.slug}.html`);
    }
    saveBlogPosts(blogPosts);

    console.log('\nSending alerts...');
    await sendAlerts(allNew);
  } else {
    console.log('\nNo new listings found.');
  }

  saveNewListings(newListings);
  saveKnown(known);

  const blogPosts = loadBlogPosts();
  writeFileSync(INDEX_HTML, generateHtml(allNew, newListings, known, blogPosts));
  console.log(`  📄 Generated docs/index.html (${newListings.length} total entries)`);

  console.log('\nDone.');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
