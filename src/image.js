import pkg from '@napi-rs/canvas';
const { createCanvas, GlobalFonts } = pkg;

const WIDTH = 1200;
const HEIGHT = 630;

const TYPE_COLORS = {
  signal: '#f7931a',
  education: '#3b82f6',
  news: '#ef4444',
  tip: '#10b981',
  motivation: '#8b5cf6',
  humor: '#f43f5e',
};

const TYPE_LABELS = {
  signal: 'SIGNAL',
  education: 'EDUCATION',
  news: 'NEWS',
  tip: 'TRADING TIP',
  motivation: 'MINDSET',
  humor: 'CRYPTO HUMOR',
};

function drawGrid(ctx) {
  ctx.strokeStyle = '#ffffff08';
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawMiniChart(ctx) {
  const cx = WIDTH - 320;
  const cy = 110;
  const w = 280;
  const h = 80;

  ctx.strokeStyle = '#ffffff15';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy + h / 2);
  ctx.lineTo(cx + w, cy + h / 2);
  ctx.stroke();

  const points = [];
  let y = cy + h / 2;
  for (let x = cx; x <= cx + w; x += 20) {
    y += (Math.random() - 0.48) * 14;
    y = Math.max(cy + 5, Math.min(cy + h - 5, y));
    points.push({ x, y });
  }

  const gradient = ctx.createLinearGradient(cx, 0, cx + w, 0);
  gradient.addColorStop(0, '#10b981');
  gradient.addColorStop(0.5, '#3b82f6');
  gradient.addColorStop(1, '#8b5cf6');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  points.forEach(p => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCandlesticks(ctx, color) {
  const baseX = WIDTH - 200;
  const baseY = HEIGHT - 180;

  ctx.save();
  ctx.globalAlpha = 0.06;

  const candles = [
    { open: 0, close: 20, high: -10, low: 30 },
    { open: 0, close: -15, high: 20, low: -25 },
    { open: 0, close: 25, high: 30, low: -5 },
    { open: 0, close: -10, high: 15, low: -20 },
    { open: 0, close: 12, high: 18, low: -8 },
    { open: 0, close: -8, high: 10, low: -15 },
    { open: 0, close: 18, high: 22, low: -5 },
    { open: 0, close: -20, high: 5, low: -30 },
    { open: 0, close: 30, high: 35, low: 5 },
    { open: 0, close: 5, high: 15, low: -10 },
  ];

  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  candles.forEach((c, i) => {
    const x = baseX + i * 18;
    const bodyTop = c.open > 0 ? baseY + c.open : baseY + c.close;
    const bodyH = Math.abs(c.close - c.open) || 2;

    ctx.fillRect(x - 3, bodyTop, 6, Math.max(bodyH, 2));
    ctx.beginPath();
    ctx.moveTo(x, baseY + c.high);
    ctx.lineTo(x, baseY + c.low);
    ctx.stroke();
  });

  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const chars = [...text];
  const lines = [];
  let current = '';

  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && ch === ' ') {
      lines.push(current);
      current = '';
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export function generateImage(type, text) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const color = TYPE_COLORS[type] || '#f7931a';
  const label = TYPE_LABELS[type] || 'POST';

  // background
  const bg = ctx.createRadialGradient(600, 300, 100, 600, 300, 700);
  bg.addColorStop(0, '#141a24');
  bg.addColorStop(1, '#0b0e14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // subtle grid
  drawGrid(ctx);

  // accent bar
  const barGrad = ctx.createLinearGradient(0, 0, 8, 0);
  barGrad.addColorStop(0, color);
  barGrad.addColorStop(1, color + '00');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, 8, HEIGHT);

  // glow from accent
  const glow = ctx.createRadialGradient(8, HEIGHT / 2, 0, 8, HEIGHT / 2, 350);
  glow.addColorStop(0, color + '12');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 400, HEIGHT);

  // decorative candlesticks
  drawCandlesticks(ctx, color);

  // mini chart
  drawMiniChart(ctx);

  // type badge
  ctx.fillStyle = color + '25';
  const badgeX = 50, badgeY = 45, badgeW = 175, badgeH = 44, badgeR = 22;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeR);
  ctx.fill();

  ctx.strokeStyle = color + '60';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeR);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = 'bold 18px Segoe UI, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), 65, 68);

  // time
  ctx.fillStyle = '#5a6577';
  ctx.font = '14px Segoe UI, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  const now = new Date();
  const timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, WIDTH - 50, 68);
  ctx.textAlign = 'left';

  // extract clean text for image
  const clean = text
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/#\w+/g, '')
    .replace(/@\w+/g, '')
    .replace(/\d{10,}/g, '')
    .replace(/[─=]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 280);

  // main text
  ctx.fillStyle = '#e6edf3';
  ctx.font = '600 32px Segoe UI, Arial, sans-serif';
  ctx.textBaseline = 'top';

  const maxW = WIDTH - 180;
  const paragraphs = clean.split('\n').filter(Boolean);
  let yPos = 120;
  const lineH = 44;

  for (const para of paragraphs) {
    if (yPos > 400) break;
    const lines = wrapText(ctx, para, maxW);
    for (const line of lines.slice(0, 2)) {
      if (yPos > 400) break;
      ctx.fillText(line, 50, yPos);
      yPos += lineH;
    }
    yPos += 8;
  }

  // bottom bar
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(0, HEIGHT - 64, WIDTH, 64);

  ctx.fillStyle = '#8b949e';
  ctx.font = '15px Segoe UI, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('CryptoC Daily', 50, HEIGHT - 32);

  ctx.fillStyle = '#5a6577';
  ctx.font = '13px Segoe UI, Arial, sans-serif';
  ctx.fillText('t.me/maishin2', 185, HEIGHT - 32);

  // type indicator dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(WIDTH - 55, HEIGHT - 32, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color + '80';
  ctx.font = '12px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(label.toUpperCase(), WIDTH - 75, HEIGHT - 32);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}
