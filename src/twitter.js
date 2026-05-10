import { TwitterApi } from 'twitter-api-v2';

let client = null;

function getClient(apiKey, apiSecret, accessToken, accessSecret) {
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return null;
  }
  if (!client) {
    client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });
  }
  return client;
}

export async function postToTwitter(apiKey, apiSecret, accessToken, accessSecret, text) {
  const c = getClient(apiKey, apiSecret, accessToken, accessSecret);
  if (!c) {
    console.log('  ⚠️  Twitter not configured. Skipping.');
    return false;
  }

  try {
    const tweet = await c.v2.tweet(text);
    console.log(`  ✅ Posted to Twitter/X (tweet #${tweet.data.id})`);
    return true;
  } catch (e) {
    const msg = e.data?.detail || e.message;
    console.log(`  ❌ Twitter error: ${msg}`);

    if (msg?.includes('duplicate')) {
      console.log('     └─ Duplicate content — tweak text and retry');
    }
    if (msg?.includes('403')) {
      console.log('     └─ Check your X API plan — free tier has limits');
    }
    return false;
  }
}
