// Neon Boulevard Cover Studio — editor wiring.
// Owns the app state, builds the controls (layouts, grades, words, panel
// crop, sizes), paints the live preview, and exports real PNGs from the
// same drawCoverArt the preview uses. Photos are read on this machine and
// never uploaded. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js).
import { SIZES, LAYOUTS, GRADES, findLayout, findGrade, drawCoverArt } from './cover.js';

const canvas = document.getElementById('preview');
const statusEl = document.getElementById('status');
const photoStrip = document.getElementById('photo-strip');

export const state = {
  photos: [],          // HTMLImageElement, up to 5
  photoNames: [],
  layout: 'hero-left',
  grade: 'vice-sunset',
  size: 'square',
  caption: 'NEON BOULEVARD',
  tagline: 'Vice City nights · your story',
  badge: 'EST. 2026',
  crops: [],           // one per layout panel: {photo, zoom, dx, dy, rot}
  selectedPanel: 0,
};

function defaultCrops() {
  const layout = findLayout(state.layout);
  state.crops = layout.panels.map((_, i) => ({
    photo: state.photos.length ? i % state.photos.length : 0,
    zoom: 1, dx: 0, dy: 0, rot: 0,
  }));
  state.selectedPanel = 0;
}

function redraw() {
  const size = SIZES[state.size];
  // In cover-shot mode the canvas fills the viewport: paint it at the
  // screenshot's own resolution so the exported cover stays sharp.
  const coverShot = document.body.classList.contains('shot-cover');
  const scale = coverShot
    ? Math.min(1280 / size.w, 1280 / size.h)
    : Math.min(760 / size.w, 560 / size.h);
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  const ctx = canvas.getContext('2d');
  drawCoverArt(ctx, { ...state, size: state.size }, canvas.width, canvas.height);
  // No selection outline on a cover shot: the cover must be clean.
  if (!document.body.classList.contains('shot-cover')) highlightSelectedPanel();
}

function highlightSelectedPanel() {
  // Draw a dashed outline around the selected panel on the preview.
  const size = SIZES[state.size];
  const layout = findLayout(state.layout);
  const bandH = Math.round(canvas.height * (state.size === 'landscape' ? 0.3 : 0.27));
  const photoH = canvas.height - bandH;
  const p = layout.panels[state.selectedPanel];
  if (!p) return;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#22d3ee';
  ctx.strokeRect(p.x * canvas.width + 3, p.y * photoH + 3, p.w * canvas.width - 6, p.h * photoH - 6);
  ctx.restore();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function addPhoto(img, name) {
  if (state.photos.length >= 5) {
    setStatus('Five photos is the most — remove one first.');
    return;
  }
  state.photos.push(img);
  state.photoNames.push(name);
  if (state.crops.length === 0) defaultCrops();
  renderPhotoStrip();
  redraw();
}

function renderPhotoStrip() {
  photoStrip.innerHTML = '';
  state.photos.forEach((img, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.title = `${state.photoNames[i]} — click to use in the selected panel`;
    const t = document.createElement('canvas');
    t.width = 72; t.height = 72;
    const tctx = t.getContext('2d');
    const s = Math.max(72 / img.naturalWidth, 72 / img.naturalHeight);
    tctx.drawImage(img, (72 - img.naturalWidth * s) / 2, (72 - img.naturalHeight * s) / 2,
      img.naturalWidth * s, img.naturalHeight * s);
    thumb.appendChild(t);
    thumb.appendChild(Object.assign(document.createElement('span'), { textContent: state.photoNames[i] }));
    thumb.addEventListener('click', () => {
      state.crops[state.selectedPanel].photo = i;
      syncPanelControls();
      redraw();
    });
    const rm = document.createElement('span');
    rm.className = 'thumb-remove';
    rm.textContent = '×';
    rm.title = 'Remove this photo';
    rm.addEventListener('click', (e) => {
      e.stopPropagation();
      state.photos.splice(i, 1);
      state.photoNames.splice(i, 1);
      state.crops.forEach((c) => { c.photo = Math.min(c.photo, Math.max(0, state.photos.length - 1)); });
      renderPhotoStrip();
      redraw();
    });
    thumb.appendChild(rm);
    photoStrip.appendChild(thumb);
  });
  if (state.photos.length === 0) {
    photoStrip.textContent = 'No photos yet — add your own or tap a sample below.';
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

// --- controls ---------------------------------------------------------------

function buildPickers() {
  const layoutBox = document.getElementById('layout-picker');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.textContent = l.name;
    b.dataset.id = l.id;
    b.addEventListener('click', () => {
      state.layout = l.id;
      defaultCrops();
      syncPickers();
      syncPanelControls();
      redraw();
    });
    layoutBox.appendChild(b);
  });

  const gradeBox = document.getElementById('grade-picker');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.title = g.name;
    b.dataset.id = g.id;
    b.style.background = `linear-gradient(135deg, ${g.sky[0]}, ${g.sky[1]} 55%, ${g.sky[2]})`;
    b.addEventListener('click', () => {
      state.grade = g.id;
      syncPickers();
      redraw();
    });
    gradeBox.appendChild(b);
  });

  const sizeBox = document.getElementById('size-picker');
  Object.entries(SIZES).forEach(([id, s]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.textContent = s.label;
    b.dataset.id = id;
    b.addEventListener('click', () => {
      state.size = id;
      syncPickers();
      redraw();
    });
    sizeBox.appendChild(b);
  });
}

function syncPickers() {
  document.querySelectorAll('#layout-picker .pick').forEach((b) =>
    b.classList.toggle('active', b.dataset.id === state.layout));
  document.querySelectorAll('#grade-picker .swatch').forEach((b) =>
    b.classList.toggle('active', b.dataset.id === state.grade));
  document.querySelectorAll('#size-picker .pick').forEach((b) =>
    b.classList.toggle('active', b.dataset.id === state.size));
  document.getElementById('grade-name').textContent = findGrade(state.grade).name;
}

function syncPanelControls() {
  const crop = state.crops[state.selectedPanel] || { photo: 0, zoom: 1, dx: 0, dy: 0, rot: 0 };
  document.getElementById('panel-label').textContent =
    `Panel ${state.selectedPanel + 1} of ${findLayout(state.layout).panels.length}`;
  document.getElementById('panel-photo').value = String(crop.photo);
  document.getElementById('zoom').value = crop.zoom;
  document.getElementById('pan-x').value = crop.dx;
  document.getElementById('pan-y').value = crop.dy;
  document.getElementById('rotate').value = crop.rot;
  document.getElementById('zoom-val').textContent = `${Math.round(crop.zoom * 100)}%`;
  document.getElementById('rotate-val').textContent = `${crop.rot}°`;
}

function bindPanelControls() {
  const photoSel = document.getElementById('panel-photo');
  const rebuildOptions = () => {
    photoSel.innerHTML = '';
    state.photos.forEach((_, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `Photo ${i + 1} — ${state.photoNames[i]}`;
      photoSel.appendChild(o);
    });
  };
  // Rebuild the options whenever the photo list changes.
  const observer = new MutationObserver(rebuildOptions);
  observer.observe(photoStrip, { childList: true });

  photoSel.addEventListener('change', () => {
    state.crops[state.selectedPanel].photo = Number(photoSel.value);
    redraw();
  });
  const bindRange = (id, key, parse = Number) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state.crops[state.selectedPanel][key] = parse(e.target.value);
      syncPanelControls();
      redraw();
    });
  };
  bindRange('zoom', 'zoom', (v) => Number(v));
  bindRange('pan-x', 'dx', (v) => Number(v));
  bindRange('pan-y', 'dy', (v) => Number(v));
  bindRange('rotate', 'rot', (v) => Number(v));
  document.getElementById('panel-prev').addEventListener('click', () => {
    state.selectedPanel = (state.selectedPanel - 1 + state.crops.length) % state.crops.length;
    syncPanelControls();
    redraw();
  });
  document.getElementById('panel-next').addEventListener('click', () => {
    state.selectedPanel = (state.selectedPanel + 1) % state.crops.length;
    syncPanelControls();
    redraw();
  });
}

// Click a panel to select it; drag to pan it; wheel to zoom it.
function bindCanvasGestures() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function panelAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const px = (clientX - r.left) * (canvas.width / r.width);
    const py = (clientY - r.top) * (canvas.height / r.height);
    const layout = findLayout(state.layout);
    const bandH = Math.round(canvas.height * (state.size === 'landscape' ? 0.3 : 0.27));
    const photoH = canvas.height - bandH;
    for (let i = layout.panels.length - 1; i >= 0; i--) {
      const p = layout.panels[i];
      if (px >= p.x * canvas.width && px <= (p.x + p.w) * canvas.width &&
          py >= p.y * photoH && py <= (p.y + p.h) * photoH) return i;
    }
    return -1;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const i = panelAt(e.clientX, e.clientY);
    if (i < 0) return;
    state.selectedPanel = i;
    syncPanelControls();
    redraw();
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const r = canvas.getBoundingClientRect();
    const crop = state.crops[state.selectedPanel];
    crop.dx = Math.max(-0.5, Math.min(0.5, crop.dx + ((e.clientX - lastX) / r.width) * 0.8));
    crop.dy = Math.max(-0.5, Math.min(0.5, crop.dy + ((e.clientY - lastY) / r.height) * 0.8));
    lastX = e.clientX;
    lastY = e.clientY;
    syncPanelControls();
    redraw();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const crop = state.crops[state.selectedPanel];
    crop.zoom = Math.max(1, Math.min(2.5, crop.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    syncPanelControls();
    redraw();
  }, { passive: false });
}

// --- export -----------------------------------------------------------------

function exportPng(sizeId) {
  const size = SIZES[sizeId];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCoverArt(off.getContext('2d'), { ...state, size: sizeId }, size.w, size.h);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-boulevard-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved neon-boulevard-cover-${size.w}x${size.h}.png (${size.w} × ${size.h})`);
  }, 'image/png');
}

document.getElementById('export-one').addEventListener('click', () => exportPng(state.size));
document.getElementById('export-all').addEventListener('click', () => {
  Object.keys(SIZES).forEach((id, i) => setTimeout(() => exportPng(id), i * 350));
  setStatus('Exporting all three sizes…');
});

// --- photos -----------------------------------------------------------------

document.getElementById('photo-input').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      await addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'photo');
    } catch { setStatus(`Could not read ${file.name}.`); }
  }
  e.target.value = '';
});

document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    try {
      const img = await loadImage(`samples/${b.dataset.sample}.jpg`);
      await addPhoto(img, b.dataset.sample);
    } catch { setStatus(`Sample ${b.dataset.sample} failed to load.`); }
  });
});

// --- words ------------------------------------------------------------------

document.getElementById('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
document.getElementById('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
document.getElementById('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });

// --- boot -------------------------------------------------------------------

buildPickers();
bindPanelControls();
bindCanvasGestures();
syncPickers();
defaultCrops();
renderPhotoStrip();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  const { runShot } = await import('./shots.js');
  await runShot(shot, new URLSearchParams(location.search), { state, loadImage, addPhoto, redraw, renderPhotoStrip, syncPickers, syncPanelControls, defaultCrops });
} else {
  // First run already looks great: load the two bundled sample photos.
  for (const name of ['boulevard', 'pier']) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push(img);
      state.photoNames.push(name);
    } catch { /* samples are optional */ }
  }
  defaultCrops();
  renderPhotoStrip();
  syncPanelControls();
  redraw();
}

// Exposed for the screenshot scenes and for debugging in the console.
window.__coverStudio = { state, redraw, exportPng };
