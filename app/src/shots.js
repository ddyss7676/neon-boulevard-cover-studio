// Fixed scenes for screenshots: ?shot=cover shows the cover alone, full
// frame; ?shot=editor shows the editor with photos loaded. Query params:
// photo (comma list of sample names), layout, grade, size, caption,
// tagline, badge. window.__shotReady is set once the scene has painted,
// so a headless browser knows when to take the shot.
export async function runShot(shot, query, app) {
  const { state, loadImage, redraw, renderPhotoStrip, syncPickers, syncPanelControls, defaultCrops } = app;

  if (shot === 'cover') document.body.classList.add('shot-cover');

  const names = (query.get('photo') || 'boulevard,pier').split(',').map((s) => s.trim()).filter(Boolean);
  for (const name of names) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push(img);
      state.photoNames.push(name);
    } catch { /* a missing sample just leaves fewer photos */ }
  }
  renderPhotoStrip();
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('caption') !== null) state.caption = query.get('caption');
  if (query.get('tagline') !== null) state.tagline = query.get('tagline');
  if (query.get('badge') !== null) state.badge = query.get('badge');
  // Face-safe framing for the bundled samples: both sample photos are
  // portrait shots with the face near the top, so in a wide panel the
  // cover-fit crop would cut the face off. Pan down a little and stay
  // near 1:1 zoom so the faces stay in frame.
  defaultCrops();
  state.crops.forEach((crop) => {
    const name = state.photoNames[crop.photo] || '';
    if (name === 'boulevard') { crop.zoom = 1.0; crop.dy = 0.16; }
    if (name === 'pier') { crop.zoom = 1.05; crop.dy = 0.12; }
  });
  syncPickers();
  syncPanelControls();
  redraw();
  if (shot === 'editor') {
    // Let the editor settle, then mark ready.
    await new Promise((r) => setTimeout(r, 120));
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
