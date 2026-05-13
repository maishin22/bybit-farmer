import 'dotenv/config';
import { fileURLToPath } from 'url';
import { generatePost } from './generator.js';
import { generateImage } from './image.js';
import { postToTelegram } from './telegram.js';
import { postToTwitter } from './twitter.js';
import { postToDiscord } from './discord.js';
import { postToBluesky } from './bluesky.js';

function loadConfig() {
  return {
    telegramBot: process.env.TELEGRAM_BOT_TOKEN,
    telegramChat: process.env.TELEGRAM_CHANNEL_ID,
    twitterKey: process.env.TWITTER_API_KEY,
    twitterSecret: process.env.TWITTER_API_SECRET,
    twitterAccess: process.env.TWITTER_ACCESS_TOKEN,
    twitterAccessSecret: process.env.TWITTER_ACCESS_SECRET,
    discordWebhook: process.env.DISCORD_WEBHOOK_URL,
    blueskyHandle: process.env.BLUESKY_HANDLE,
    blueskyPassword: process.env.BLUESKY_APP_PASSWORD,
  };
}

async function main() {
  console.log('');
  console.log('=== Bybit Affiliate Auto-Poster ===');
  console.log(`[${new Date().toISOString()}]`);

  const cfg = loadConfig();

  const { type, text } = generatePost();
  console.log(`\nGenerated: [${type}]`);
  console.log(text.slice(0, 120) + '...');

  const imageBuffer = generateImage(type, text);
  console.log(`  🖼️  Image generated (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

  console.log('\n--- Posting ---');
  await postToTelegram(cfg.telegramBot, cfg.telegramChat, text, imageBuffer);
  await postToTwitter(cfg.twitterKey, cfg.twitterSecret, cfg.twitterAccess, cfg.twitterAccessSecret, text);
  await postToDiscord(cfg.discordWebhook, text);
  await postToBluesky(cfg.blueskyHandle, cfg.blueskyPassword, text);

  console.log('\nDone.\n');

  return { type, text };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export { main as postOnce };
