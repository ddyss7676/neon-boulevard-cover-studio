// Neon Boulevard Cover Studio — cover render engine.
// Draws a multi-panel GTA-poster-style cover onto any 2D canvas context:
// photo panels (each with its own crop: zoom, pan, rotation), a sunset title
// band with palm silhouettes, and bold outlined caption lettering. Pure
// Canvas 2D, no libraries, no network. The same function paints the live
// preview and the exported PNGs, so what you see is what you share.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: 'Landscape · 1920 × 1080' },
};

// Panel rectangles are fractions of the photo region (the canvas minus the
// title band at the bottom). Eight layouts, from a single full-bleed photo
// to a four-panel grid.
export const LAYOUTS = [
  { id: 'hero-left', name: 'Hero Left', panels: [
    { x: 0, y: 0, w: 0.62, h: 1 },
    { x: 0.62, y: 0, w: 0.38, h: 0.5 },
    { x: 0.62, y: 0.5, w: 0.38, h: 0.5 } ] },
  { id: 'hero-right', name: 'Hero Right', panels: [
    { x: 0, y: 0, w: 0.38, h: 0.5 },
    { x: 0, y: 0.5, w: 0.38, h: 0.5 },
    { x: 0.38, y: 0, w: 0.62, h: 1 } ] },
  { id: 'hero-top', name: 'Hero Top', panels: [
    { x: 0, y: 0, w: 1, h: 0.6 },
    { x: 0, y: 0.6, w: 0.34, h: 0.4 },
    { x: 0.34, y: 0.6, w: 0.33, h: 0.4 },
    { x: 0.67, y: 0.6, w: 0.33, h: 0.4 } ] },
  { id: 'grid', name: 'Four Grid', panels: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } ] },
  { id: 'triptych', name: 'Triptych', panels: [
    { x: 0, y: 0, w: 0.34, h: 1 },
    { x: 0.34, y: 0, w: 0.33, h: 1 },
    { x: 0.67, y: 0, w: 0.33, h: 1 } ] },
  { id: 'fullbleed', name: 'Full Bleed', panels: [
    { x: 0, y: 0, w: 1, h: 1 } ] },
  { id: 'strip', name: 'Hero + Strip', panels: [
    { x: 0, y: 0, w: 1, h: 0.68 },
    { x: 0, y: 0.68, w: 0.34, h: 0.32 },
    { x: 0.34, y: 0.68, w: 0.33, h: 0.32 },
    { x: 0.67, y: 0.68, w: 0.33, h: 0.32 } ] },
  { id: 'split', name: 'Split Frame', panels: [
    { x: 0, y: 0, w: 0.55, h: 1 },
    { x: 0.55, y: 0, w: 0.45, h: 0.55 },
    { x: 0.55, y: 0.55, w: 0.225, h: 0.45 },
    { x: 0.775, y: 0.55, w: 0.225, h: 0.45 } ] },
];

// Colour grades: a sunset sky for the title band, a wash tint laid over the
// photos, and the lettering palette. Six grades, all drawn, none fetched.
export const GRADES = [
  { id: 'vice-sunset', name: 'Vice Sunset', sky: ['#ffd166', '#ff5e3a', '#ff2e88'],
    wash: '#ff2e88', washAlpha: 0.16, ink: '#1c0b2e', accent: '#ff2e88', paper: '#fff7e6' },
  { id: 'neon-nights', name: 'Neon Nights', sky: ['#2b0a4a', '#7c3aed', '#ff2e88'],
    wash: '#22d3ee', washAlpha: 0.14, ink: '#0d0218', accent: '#22d3ee', paper: '#fdf4ff' },
  { id: 'golden-hour', name: 'Golden Hour', sky: ['#ffe29a', '#ffb347', '#ff6b35'],
    wash: '#ff9f1c', washAlpha: 0.15, ink: '#2a1503', accent: '#ff6b35', paper: '#fffbe8' },
  { id: 'teal-dusk', name: 'Teal Dusk', sky: ['#5eead4', '#0d9488', '#134e4a'],
    wash: '#14b8a6', washAlpha: 0.15, ink: '#042f2e', accent: '#f472b6', paper: '#f0fdfa' },
  { id: 'hot-magenta', name: 'Hot Magenta', sky: ['#fda4af', '#f43f5e', '#a21caf'],
    wash: '#e879f9', washAlpha: 0.16, ink: '#2a0a2e', accent: '#facc15', paper: '#fff1f2' },
  { id: 'mono-noir', name: 'Mono Noir', sky: ['#e5e5e5', '#737373', '#111111'],
    wash: '#a3a3a3', washAlpha: 0.12, ink: '#0a0a0a', accent: '#f5f5f5', paper: '#fafafa' },
];

export function findLayout(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function findGrade(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Deterministic pseudo-random numbers, so the grain looks the same on every
// render of the same cover.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo into a panel rect, cover-fit, with zoom / pan / rotation. */
export function drawPanelPhoto(ctx, img, rect, crop) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const base = Math.max(w / iw, h / ih);
    const scale = base * (crop.zoom || 1);
    // Clamp the pan to the photo's own overflow, so no pan or zoom can ever
    // leave a bare gap at a panel edge (rotation aside, which stays small).
    const overX = Math.max(0, (iw * scale - w) / 2);
    const overY = Math.max(0, (ih * scale - h) / 2);
    const px = Math.max(-overX, Math.min(overX, (crop.dx || 0) * w));
    const py = Math.max(-overY, Math.min(overY, (crop.dy || 0) * h));
    ctx.translate(x + w / 2 + px, y + h / 2 + py);
    ctx.rotate(((crop.rot || 0) * Math.PI) / 180);
    ctx.drawImage(img, (-iw * scale) / 2, (-ih * scale) / 2, iw * scale, ih * scale);
  } else {
    ctx.fillStyle = '#241533';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

/** A palm silhouette: curved trunk, seven fronds. Drawn, never an image. */
export function drawPalm(ctx, x, y, size, lean, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.06, -size * 0.5, size * 0.02, -size * 0.95);
  ctx.stroke();
  const topX = size * 0.02;
  const topY = -size * 0.95;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + (i * 0.84) / 6);
    const len = size * (0.42 - Math.abs(i - 3) * 0.035);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.45 - size * 0.08,
      topX + Math.cos(a) * len, topY + Math.sin(a) * len + size * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

/** A spiky starburst badge with centred text, tilted a little. */
export function drawBadge(ctx, cx, cy, r, text, fill, ink) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `bold ${r * 0.34}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, r * 0.02);
  ctx.restore();
}

/** Fits a one-line caption to a width, shrinking the font until it fits. */
export function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `bold ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= Math.max(1, Math.floor(size * 0.04));
    ctx.font = `bold ${size}px ${family}`;
  }
  return size;
}

const DISPLAY = '"Arial Black", Impact, "Helvetica Neue", sans-serif';

/**
 * Paints the whole cover.
 * state: { photos: Image[], layout, grade, caption, tagline, badge,
 *          crops: [{photo, zoom, dx, dy, rot}] } — crops[i] belongs to the
 *          layout's i-th panel. Photos are drawn from state.photos by index.
 */
export function drawCoverArt(ctx, state, W, H) {
  const grade = findGrade(state.grade);
  const layout = findLayout(state.layout);
  const bandH = Math.round(H * (state.size === 'landscape' ? 0.3 : 0.27));
  const photoH = H - bandH;
  const gutter = Math.max(3, Math.round(W * 0.006));

  ctx.fillStyle = '#12081c';
  ctx.fillRect(0, 0, W, H);

  // --- photo panels -------------------------------------------------------
  layout.panels.forEach((p, i) => {
    const rect = {
      x: Math.round(p.x * W) + gutter,
      y: Math.round(p.y * photoH) + gutter,
      w: Math.round(p.w * W) - gutter * 2,
      h: Math.round(p.h * photoH) - gutter * 2,
    };
    const crop = state.crops[i] || { photo: i % Math.max(1, state.photos.length), zoom: 1, dx: 0, dy: 0, rot: 0 };
    const img = state.photos[crop.photo] || state.photos[0] || null;
    drawPanelPhoto(ctx, img, rect, crop);
    // thin white frame around each panel, poster style
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1.5, W * 0.0016);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // --- colour grade wash over the photos ----------------------------------
  ctx.save();
  ctx.globalAlpha = grade.washAlpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, W, photoH);
  ctx.restore();

  // --- title band: sunset sky ---------------------------------------------
  const bandY = photoH;
  const sky = ctx.createLinearGradient(0, bandY, 0, H);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, bandY, W, bandH);

  // sun disc, low in the band
  const sunR = bandH * 0.42;
  const sunX = W * 0.82;
  const sunY = bandY + bandH * 0.52;
  const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
  sun.addColorStop(0, 'rgba(255,255,240,0.95)');
  sun.addColorStop(0.6, 'rgba(255,214,120,0.75)');
  sun.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // palm silhouettes at the band's edges
  drawPalm(ctx, W * 0.045, bandY + bandH * 0.98, bandH * 0.95, -0.1, 'rgba(24,8,36,0.8)');
  drawPalm(ctx, W * 0.955, bandY + bandH * 0.98, bandH * 0.8, 0.12, 'rgba(24,8,36,0.8)');

  // --- caption lettering ---------------------------------------------------
  const caption = (state.caption || '').trim().toUpperCase();
  const tagline = (state.tagline || '').trim();
  const maxTextW = W * 0.86;
  const capSize = fitFont(ctx, caption || ' ', maxTextW, bandH * 0.44, DISPLAY);
  const capY = bandY + bandH * 0.52;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (caption) {
    // pink/yellow offset shadow, then dark outline, then bright fill
    ctx.font = `bold ${capSize}px ${DISPLAY}`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(caption, W / 2 + capSize * 0.045, capY + capSize * 0.06);
    ctx.lineJoin = 'round';
    ctx.lineWidth = capSize * 0.16;
    ctx.strokeStyle = grade.ink;
    ctx.strokeText(caption, W / 2, capY);
    const fill = ctx.createLinearGradient(0, capY - capSize * 0.5, 0, capY + capSize * 0.5);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, grade.paper);
    ctx.fillStyle = fill;
    ctx.fillText(caption, W / 2, capY);
  }
  if (tagline) {
    const tagSize = Math.max(12, bandH * 0.13);
    ctx.font = `italic bold ${tagSize}px Georgia, "Times New Roman", serif`;
    // Light paper text with a soft dark shadow, so it reads on any grade.
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = tagSize * 0.25;
    ctx.fillStyle = grade.paper;
    ctx.fillText(tagline, W / 2, bandY + bandH * 0.86);
    ctx.shadowBlur = 0;
  }

  // --- badge starburst, top-right of the band ------------------------------
  const badgeText = (state.badge || '').trim();
  if (badgeText) {
    drawBadge(ctx, W * 0.9, bandY + bandH * 0.2, bandH * 0.24, badgeText.slice(0, 12), '#ffd166', grade.ink);
  }

  // --- vignette + grain ----------------------------------------------------
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,4,20,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  const rand = mulberry32(W * 31 + H * 7 + caption.length);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  const dots = Math.floor((W * H) / 9000);
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(rand() * W, rand() * H, 1.5, 1.5);
  }
  ctx.restore();
}
