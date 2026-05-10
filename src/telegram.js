export async function postToTelegram(botToken, chatId, text, imageBuffer) {
  if (!botToken || !chatId) {
    console.log('  ⚠️  Telegram not configured. Skipping.');
    return false;
  }

  const caption = imageBuffer ? text.substring(0, 1024) : text;

  try {
    if (imageBuffer) {
      const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'post.png');
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');

      const res = await fetch(url, { method: 'POST', body: form });
      const data = await res.json();

      if (data.ok) {
        console.log(`  ✅ Posted to Telegram with image (msg #${data.result.message_id})`);
        return true;
      } else {
        console.log(`  ❌ Telegram error: ${data.description}`);
        return false;
      }
    } else {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        console.log(`  ✅ Posted to Telegram (msg #${data.result.message_id})`);
        return true;
      } else {
        console.log(`  ❌ Telegram error: ${data.description}`);
        return false;
      }
    }
  } catch (e) {
    console.log(`  ❌ Telegram connection error: ${e.message}`);
    return false;
  }
}
