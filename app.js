/* GitGallery — app.js */

// ---- State ----
const state = {
  albums: [],
  filtered: [],
  searchQuery: '',
  selectedTags: new Set(),
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
    const res = await fetch('gallery-index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.albums = await res.json();
  } catch {
    // Fallback: show placeholder when no data
    state.albums = [];
  }
  state.filtered = state.albums;
  updateHeaderMeta();
  buildTagFilter();
  renderCards();
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

// ---- Filter Logic ----
function applyFilter() {
  const q = state.searchQuery.toLowerCase();
  state.filtered = state.albums.filter(a => {
    const matchTitle = a.title.toLowerCase().includes(q);
    const matchTags = state.selectedTags.size === 0 ||
      [...state.selectedTags].every(t => a.tags.includes(t));
    return matchTitle && matchTags;
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
  dialogOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  state.dialog.album = null;
}

function showImage(index) {
  const { album } = state.dialog;
  if (!album || index < 0 || index >= album.images.length) return;
  state.dialog.imageIndex = index;
  dialogImg.src = album.images[index];
  dialogImg.alt = `${album.title} 第 ${index + 1} 張`;
  dialogIdx.textContent = `${String(index + 1).padStart(2, '0')} / ${String(album.images.length).padStart(2, '0')}`;
  navPrev.disabled = index === 0;
  navNext.disabled = index === album.images.length - 1;
  highlightThumb(index);
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
navNext.addEventListener('click', () => showImage(state.dialog.imageIndex + 1));
dialogClose.addEventListener('click', closeDialog);
dialogOverlay.addEventListener('click', e => { if (e.target === dialogOverlay) closeDialog(); });

document.addEventListener('keydown', e => {
  if (dialogOverlay.classList.contains('hidden')) return;
  if (e.key === 'Escape') { closeDialog(); return; }
  if (e.key === 'ArrowLeft')  showImage(state.dialog.imageIndex - 1);
  if (e.key === 'ArrowRight') showImage(state.dialog.imageIndex + 1);
});

// ---- Init ----
loadGallery();
