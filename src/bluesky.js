let agent = null;
let session = null;

const PDS_URL = 'https://bsky.social';

async function ensureSession(handle, appPassword) {
  if (session) return session;

  const res = await fetch(`${PDS_URL}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create Bluesky session');
  }

  session = await res.json();
  return session;
}

function trimForBluesky(text) {
  const MAX = 300;
  const link = '\n\n🔗 t.me/maishin2';

  if ([...text].length + link.length <= MAX) {
    return text + link;
  }

  const available = MAX - link.length;
  let trimmed = [...text].slice(0, available - 1).join('') + '…';
  return trimmed + link;
}

export async function postToBluesky(handle, appPassword, text) {
  if (!handle || !appPassword) {
    console.log('  ⚠️  Bluesky not configured. Skipping.');
    return false;
  }

  try {
    const ses = await ensureSession(handle, appPassword);
    const bskyText = trimForBluesky(text);

    const postRes = await fetch(`${PDS_URL}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ses.accessJwt}`,
      },
      body: JSON.stringify({
        repo: ses.did,
        collection: 'app.bsky.feed.post',
        record: {
          $type: 'app.bsky.feed.post',
          text: bskyText,
          createdAt: new Date().toISOString(),
        },
      }),
    });

    if (postRes.ok) {
      const data = await postRes.json();
      console.log(`  ✅ Posted to Bluesky (https://bsky.app/profile/${ses.handle}/post/${data.uri.split('/').pop()})`);
      return true;
    } else {
      const err = await postRes.json();
      console.log(`  ❌ Bluesky error: ${err.message || JSON.stringify(err)}`);
      return false;
    }
  } catch (e) {
    console.log(`  ❌ Bluesky connection error: ${e.message}`);
    return false;
  }
}
