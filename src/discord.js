export async function postToDiscord(webhookUrl, text) {
  if (!webhookUrl) {
    console.log('  ⚠️  Discord not configured. Skipping.');
    return false;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });

    if (res.ok) {
      console.log('  ✅ Posted to Discord');
      return true;
    } else {
      const data = await res.json();
      console.log(`  ❌ Discord error: ${data.message || res.status}`);
      return false;
    }
  } catch (e) {
    console.log(`  ❌ Discord connection error: ${e.message}`);
    return false;
  }
}
