/* GitGallery — app.js */

// ---- State ----
const state = {
  albums: [],
  filtered: [],
  searchQuery: '',
  selectedTags: new Set(),
  sort: { field: 'createTime', dir: 'desc' },
  dialog: { album: null, imageIndex: 0 },
};

// ---- DOM refs ----
const cardGrid      = document.getElementById('card-grid');
const emptyState    = document.getElementById('empty-state');
const metaCount     = document.getElementById('meta-count');
const clearBtn      = document.getElementById('clear-btn');
const searchInput   = document.getElementById('search-input');
const tagFilterEl   = document.getElementById('tag-filter');
const sizeSlider    = document.getElementById('size-slider');
const dialogOverlay = document.getElementById('dialog-overlay');
const dialogTitleTx = document.getElementById('dialog-title-text');
const dialogIdx     = document.getElementById('dialog-idx');
const dialogImg     = document.getElementById('dialog-img');
const navPrev       = document.getElementById('nav-prev');
const navNext       = document.getElementById('nav-next');
const dialogClose   = document.getElementById('dialog-close');
const thumbStrip    = document.getElementById('thumb-strip');
const headerAuthor  = document.getElementById('header-author');
const headerDate    = document.getElementById('header-date');
const btnFullscreen  = document.getElementById('btn-fullscreen');
const zoomInBtn      = document.getElementById('zoom-in');
const zoomOutBtn     = document.getElementById('zoom-out');
const zoomResetBtn   = document.getElementById('zoom-reset');
const zoomLevelEl    = document.getElementById('zoom-level');
const tagExpandBtn   = document.getElementById('tag-expand-btn');

// ---- Helpers ----
function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---- Data Loading ----
async function loadGallery() {
  try {
    const res = await fetch('gallery-index.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.albums = await res.json();
  } catch {
    // Fallback: show placeholder when no data
    state.albums = [];
  }
  updateHeaderMeta();
  buildTagFilter();
  applyFilter();
}

function updateHeaderMeta() {
  const authors = [...new Set(state.albums.map(a => a.author).filter(Boolean))];
  headerAuthor.textContent = authors.length ? authors.join(', ') : '—';

  const latest = state.albums.reduce((max, a) =>
    (!max || a.createTime > max) ? a.createTime : max, null);
  headerDate.textContent = latest ? `updated ${fmtDate(latest)}` : '';
}

// ---- Tag Filter Builder ----
function buildTagFilter() {
  const counts = {};
  state.albums.forEach(a => a.tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
  const tags = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  tagFilterEl.querySelectorAll('[data-tag]:not([data-tag="__all__"])').forEach(el => el.remove());

  tags.forEach(([tag, count]) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.tag = tag;
    btn.innerHTML = `${tag} <span class="chip__count">${count}</span>`;
    tagFilterEl.appendChild(btn);
  });
}

// ---- Filter + Sort Logic ----
function applyFilter() {
  const q = state.searchQuery.toLowerCase();
  state.filtered = state.albums.filter(a => {
    const matchTitle = a.title.toLowerCase().includes(q);
    const matchTags = state.selectedTags.size === 0 ||
      [...state.selectedTags].every(t => a.tags.includes(t));
    return matchTitle && matchTags;
  });

  const { field, dir } = state.sort;
  state.filtered.sort((a, b) => {
    const va = a[field] ?? '';
    const vb = b[field] ?? '';
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return dir === 'asc' ? cmp : -cmp;
  });

  renderCards();
}

function activateSingleTag(tag) {
  state.selectedTags.clear();
  state.selectedTags.add(tag);
  syncChipStates();
  applyFilter();
}

function syncChipStates() {
  tagFilterEl.querySelectorAll('[data-tag]').forEach(btn => {
    const tag = btn.dataset.tag;
    const active = tag === '__all__'
      ? state.selectedTags.size === 0
      : state.selectedTags.has(tag);
    btn.classList.toggle('chip--active', active);
  });
  const hasFilter = state.searchQuery || state.selectedTags.size > 0;
  clearBtn.classList.toggle('hidden', !hasFilter);
}

// ---- Card Rendering ----
function renderCards() {
  cardGrid.innerHTML = '';
  const total = state.albums.length;
  const shown = state.filtered.length;

  metaCount.innerHTML = `<strong>${shown}</strong> / ${total} 相簿` +
    (state.selectedTags.size > 0 ? ` · 篩選：${[...state.selectedTags].join(', ')}` : '');

  if (shown === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  state.filtered.forEach(album => cardGrid.appendChild(createCard(album)));
}

function createCard(album) {
  const art = document.createElement('article');
  art.className = 'card';

  const coverWrap = document.createElement('div');
  coverWrap.className = 'card__cover';

  const img = document.createElement('img');
  img.src = album.cover;
  img.alt = album.title;
  img.loading = 'lazy';

  const count = document.createElement('span');
  count.className = 'card__count';
  count.innerHTML = `<i class="mdi mdi-image-multiple-outline"></i>${album.images.length}`;

  coverWrap.appendChild(img);
  coverWrap.appendChild(count);

  const body = document.createElement('div');
  body.className = 'card__body';

  const title = document.createElement('h2');
  title.className = 'card__title';
  title.textContent = album.title;

  const meta = document.createElement('div');
  meta.className = 'card__meta';
  meta.innerHTML = `<span>${fmtDate(album.createTime)}</span><span class="sep">·</span><span>${album.images.length} 張</span>`;

  const tagsEl = document.createElement('div');
  tagsEl.className = 'card__tags';
  album.tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'card__tag';
    btn.textContent = tag;
    btn.addEventListener('click', e => { e.stopPropagation(); activateSingleTag(tag); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    tagsEl.appendChild(btn);
  });

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(tagsEl);
  art.appendChild(coverWrap);
  art.appendChild(body);
  art.addEventListener('click', () => openDialog(album));
  return art;
}

// ---- Tag Expand ----
tagExpandBtn.addEventListener('click', () => {
  const expanded = tagFilterEl.classList.toggle('expanded');
  tagExpandBtn.classList.toggle('active', expanded);
  tagExpandBtn.querySelector('i').className = expanded ? 'mdi mdi-chevron-up' : 'mdi mdi-chevron-down';
  tagExpandBtn.title = expanded ? '收合標籤' : '展開所有標籤';
});

// ---- Sort Menu ----
const SORT_OPTIONS = [
  { label: '最新',      field: 'createTime', dir: 'desc' },
  { label: '最舊',      field: 'createTime', dir: 'asc'  },
  { label: '名稱 A→Z',  field: 'title',      dir: 'asc'  },
  { label: '名稱 Z→A',  field: 'title',      dir: 'desc' },
];

const btnSort  = document.getElementById('btn-sort');
const sortMenu = document.createElement('div');
sortMenu.className = 'sort-menu hidden';
sortMenu.setAttribute('role', 'menu');

SORT_OPTIONS.forEach(opt => {
  const btn = document.createElement('button');
  btn.className = 'sort-option';
  btn.textContent = opt.label;
  btn.setAttribute('role', 'menuitem');
  btn.addEventListener('click', () => {
    state.sort = { field: opt.field, dir: opt.dir };
    syncSortMenu();
    applyFilter();
    sortMenu.classList.add('hidden');
  });
  sortMenu.appendChild(btn);
});

btnSort.parentElement.appendChild(sortMenu);

function syncSortMenu() {
  const isDefault = state.sort.field === 'createTime' && state.sort.dir === 'desc';
  btnSort.classList.toggle('icon-btn--active', !isDefault);
  sortMenu.querySelectorAll('.sort-option').forEach((btn, i) => {
    const opt = SORT_OPTIONS[i];
    btn.classList.toggle('sort-option--active',
      opt.field === state.sort.field && opt.dir === state.sort.dir);
  });
}

btnSort.addEventListener('click', e => {
  e.stopPropagation();
  sortMenu.classList.toggle('hidden');
  syncSortMenu();
});

document.addEventListener('click', () => sortMenu.classList.add('hidden'));

// ---- Events: search, tag filter, size slider ----
searchInput.addEventListener('input', debounce(e => {
  state.searchQuery = e.target.value.trim();
  syncChipStates();
  applyFilter();
}, 250));

tagFilterEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-tag]');
  if (!btn) return;
  const tag = btn.dataset.tag;
  if (tag === '__all__') {
    state.selectedTags.clear();
  } else {
    if (state.selectedTags.has(tag)) state.selectedTags.delete(tag);
    else state.selectedTags.add(tag);
  }
  syncChipStates();
  applyFilter();
});

clearBtn.addEventListener('click', () => {
  state.searchQuery = '';
  state.selectedTags.clear();
  searchInput.value = '';
  syncChipStates();
  applyFilter();
});

sizeSlider.addEventListener('input', e => {
  document.documentElement.style.setProperty('--gg-card-min', `${e.target.value}px`);
});

// ---- Zoom ----
const ZOOM_MIN = 1, ZOOM_MAX = 4, ZOOM_STEP = 0.25;
let zoom = { scale: 1, panX: 0, panY: 0, dragging: false, startX: 0, startY: 0 };

function applyZoom() {
  const { scale, panX, panY } = zoom;
  dialogImg.style.transform = scale === 1 ? '' : `translate(${panX}px, ${panY}px) scale(${scale})`;
  dialogImg.style.cursor = scale > 1 ? (zoom.dragging ? 'grabbing' : 'grab') : '';
  dialogImg.style.transition = zoom.dragging ? 'none' : 'transform .15s ease';
  zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
  zoomInBtn.disabled  = scale >= ZOOM_MAX;
  zoomOutBtn.disabled = scale <= ZOOM_MIN;
  zoomResetBtn.classList.toggle('hidden', scale === ZOOM_MIN);
}

function resetZoom() {
  zoom = { scale: 1, panX: 0, panY: 0, dragging: false, startX: 0, startY: 0 };
  applyZoom();
}

function changeScale(delta) {
  zoom.scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom.scale + delta));
  if (zoom.scale === ZOOM_MIN) { zoom.panX = 0; zoom.panY = 0; }
  applyZoom();
}

dialogImg.addEventListener('wheel', e => {
  e.preventDefault();
  changeScale(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
}, { passive: false });

dialogImg.addEventListener('dblclick', () => {
  zoom.scale === 1 ? changeScale(1) : resetZoom();
});

dialogImg.addEventListener('dragstart', e => e.preventDefault());

dialogImg.addEventListener('mousedown', e => {
  if (zoom.scale <= 1) return;
  e.preventDefault();
  zoom.dragging = true;
  zoom.startX = e.clientX - zoom.panX;
  zoom.startY = e.clientY - zoom.panY;
  dialogImg.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', e => {
  if (!zoom.dragging) return;
  zoom.panX = e.clientX - zoom.startX;
  zoom.panY = e.clientY - zoom.startY;
  applyZoom();
});

document.addEventListener('mouseup', () => {
  if (!zoom.dragging) return;
  zoom.dragging = false;
  dialogImg.style.cursor = zoom.scale > 1 ? 'grab' : '';
});

zoomInBtn.addEventListener('click',  () => changeScale(ZOOM_STEP));
zoomOutBtn.addEventListener('click', () => changeScale(-ZOOM_STEP));
zoomResetBtn.addEventListener('click', resetZoom);

// ---- Fullscreen ----
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    dialogOverlay.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', () => {
  const icon = btnFullscreen.querySelector('i');
  icon.className = document.fullscreenElement ? 'mdi mdi-fullscreen-exit' : 'mdi mdi-fullscreen';
});

btnFullscreen.addEventListener('click', toggleFullscreen);

// ---- Dialog ----
function openDialog(album) {
  state.dialog.album = album;
  state.dialog.imageIndex = 0;
  dialogTitleTx.textContent = album.title;
  renderThumbs();
  showImage(0);
  dialogOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDialog() {
  if (document.fullscreenElement) document.exitFullscreen();
  dialogOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  state.dialog.album = null;
  resetZoom();
}

function showImage(index) {
  const { album } = state.dialog;
  if (!album || index < 0 || index >= album.images.length) return;
  state.dialog.imageIndex = index;
  dialogImg.src = album.images[index];
  dialogImg.alt = `${album.title} 第 ${index + 1} 張`;
  dialogIdx.textContent = `${String(index + 1).padStart(2, '0')} / ${String(album.images.length).padStart(2, '0')}`;
  navPrev.disabled = index === 0;
  const isLast = index === album.images.length - 1;
  const currentAlbumIdx = state.filtered.indexOf(album);
  const hasNextAlbum = currentAlbumIdx < state.filtered.length - 1;
  navNext.disabled = isLast && !hasNextAlbum;
  highlightThumb(index);
  resetZoom();
}

function renderThumbs() {
  thumbStrip.innerHTML = '';
  state.dialog.album.images.forEach((src, i) => {
    const btn = document.createElement('button');
    btn.className = 'thumb';
    btn.setAttribute('aria-label', `縮圖 ${i + 1}`);
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    btn.appendChild(img);
    btn.addEventListener('click', () => showImage(i));
    thumbStrip.appendChild(btn);
  });
}

function highlightThumb(index) {
  thumbStrip.querySelectorAll('.thumb').forEach((el, i) => {
    el.classList.toggle('thumb--active', i === index);
  });
  const active = thumbStrip.children[index];
  if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

navPrev.addEventListener('click', () => showImage(state.dialog.imageIndex - 1));
navNext.addEventListener('click', () => {
  const { album, imageIndex } = state.dialog;
  if (imageIndex < album.images.length - 1) {
    showImage(imageIndex + 1);
  } else {
    const currentIdx = state.filtered.indexOf(album);
    if (currentIdx < state.filtered.length - 1) {
      openDialog(state.filtered[currentIdx + 1]);
    }
  }
});
dialogClose.addEventListener('click', closeDialog);
dialogOverlay.addEventListener('click', e => {
  const inside = e.target.closest('.dialog__head, .thumb-strip, .dialog__nav, .dialog__img-wrap, .zoom-controls');
  if (!inside) closeDialog();
});

document.addEventListener('keydown', e => {
  if (dialogOverlay.classList.contains('hidden')) return;
  if (e.key === 'Escape') {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    closeDialog();
    return;
  }
  if (e.key === 'ArrowLeft')  showImage(state.dialog.imageIndex - 1);
  if (e.key === 'ArrowRight') showImage(state.dialog.imageIndex + 1);
  if (e.key === '+' || e.key === '=') changeScale(ZOOM_STEP);
  if (e.key === '-') changeScale(-ZOOM_STEP);
  if (e.key === '0') resetZoom();
});

// ---- Init ----
loadGallery();
