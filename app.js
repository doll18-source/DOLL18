// Data video dibaca dari videos.json (ikut di-hosting bersama web di GitHub Pages)

async function loadVideos() {
    try {
        const res = await fetch('videos.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return (Array.isArray(data) ? data : [])
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
        console.error('Gagal memuat videos.json', e);
        return null; // null = gagal memuat
    }
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).replace(/\./g, ':');
}

function isValidHttpUrl(str) {
    try {
        const u = new URL(str);
        return u.protocol === 'https:' || u.protocol === 'http:';
    } catch (e) {
        return false;
    }
}

// Link embed (/e/ID) -> link download (/d/ID) khusus playmogo
function getDownloadUrl(embedUrl) {
    try {
        const u = new URL(embedUrl);
        if (u.hostname.includes('playmogo.com') && u.pathname.startsWith('/e/')) {
            return u.origin + u.pathname.replace('/e/', '/d/');
        }
    } catch (e) {}
    return null;
}

// Tombol tema: matahari = mode pink (terang), bulan = mode gelap
function initThemeToggle() {
    const btn = document.getElementById('theme-btn');
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    function apply(dark) {
        if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
        if (meta) meta.setAttribute('content', dark ? '#210d19' : '#ffe9f2');
        if (btn) btn.className = dark ? 'fas fa-moon' : 'fas fa-sun';
    }
    apply(root.getAttribute('data-theme') === 'dark');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const dark = root.getAttribute('data-theme') !== 'dark';
        apply(dark);
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
}
initThemeToggle();

// Tag: terima teks "a, b, c" atau array, kembalikan array bersih (maks 8, tiap tag maks 20 huruf)
function parseTags(input) {
    const arr = Array.isArray(input) ? input : String(input || '').split(/[,;\n]+/);
    const seen = new Set(), out = [];
    for (const g of arr) {
        const t = String(g).trim().replace(/\s+/g, ' ').slice(0, 20);
        if (!t) continue;
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(t);
        if (out.length >= 8) break;
    }
    return out;
}

function videoTags(v) {
    // baca "tags", dan tetap bisa baca data lama yang memakai nama "genres"
    const raw = v && (Array.isArray(v.tags) ? v.tags : v.genres);
    return Array.isArray(raw) ? parseTags(raw) : [];
}

// Kategori utama (urutan = urutan di menu). Mau tambah kategori? Tambahkan namanya di sini.
const CATEGORIES = ['INDO', 'VIRAL', 'JAV'];

function videoCategory(v) {
    const c = String((v && v.category) || '').trim().toLowerCase();
    return CATEGORIES.find(x => x.toLowerCase() === c) || '';
}

// ===== Menu garis tiga: Home + Kategori + daftar Tag =====
const MENU_CSS = `
.menu-overlay { position: fixed; inset: 0; background: rgba(60,20,40,0.35); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); opacity: 0; pointer-events: none; transition: opacity .25s; z-index: 200; }
.menu-overlay.open { opacity: 1; pointer-events: auto; }
.menu-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(300px, 82vw); background: rgba(255,247,251,0.97); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); border-left: 1px solid rgba(244,114,182,0.3); transform: translateX(100%); transition: transform .28s ease; z-index: 201; display: flex; flex-direction: column; box-shadow: -8px 0 30px rgba(244,114,182,0.22); visibility: hidden; }
.menu-drawer.open { transform: none; visibility: visible; }
.menu-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 8px 18px; border-bottom: 1px solid rgba(244,114,182,0.25); font-weight: 800; letter-spacing: 1px; color: #db2777; }
.menu-close { background: none; border: none; color: #ec4899; font-size: 1.2rem; cursor: pointer; width: 44px; height: 44px; }
.menu-body { overflow-y: auto; padding: 10px; }
.menu-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 13px 14px; border: none; background: transparent; border-radius: 12px; font-size: 1rem; font-weight: 600; color: #6b2145; cursor: pointer; text-align: left; text-decoration: none; font-family: inherit; }
.menu-item:hover, .menu-item.active { background: rgba(244,114,182,0.18); color: #be185d; }
.menu-item .lead { width: 22px; text-align: center; color: #ec4899; }
.menu-item .chev { margin-left: auto; font-size: .8rem; transition: transform .2s; }
.menu-item[aria-expanded="true"] .chev { transform: rotate(180deg); }
.menu-tags { display: none; padding: 2px 0 6px 18px; }
.menu-tags.open { display: block; }
.menu-tag { text-transform: uppercase; font-size: .88rem; font-weight: 500; padding: 11px 14px; }
.menu-tag .n { margin-left: auto; font-size: .72rem; font-weight: 700; background: rgba(244,114,182,0.2); color: #be185d; padding: 1px 9px; border-radius: 10px; }
.menu-cat { text-transform: uppercase; }
.menu-item > .n { margin-left: auto; font-size: .72rem; font-weight: 700; background: rgba(244,114,182,0.2); color: #be185d; padding: 1px 9px; border-radius: 10px; }
.menu-cat .n { margin-left: auto; font-size: .72rem; font-weight: 700; background: rgba(244,114,182,0.2); color: #be185d; padding: 1px 9px; border-radius: 10px; }
.menu-empty { padding: 10px 14px; font-size: .85rem; color: #b0457a; }
html[data-theme="dark"] .menu-drawer { background: rgba(30,12,22,0.97); border-left-color: rgba(244,114,182,0.25); box-shadow: -8px 0 30px rgba(0,0,0,0.5); }
html[data-theme="dark"] .menu-head { border-bottom-color: rgba(244,114,182,0.2); color: #f472b6; }
html[data-theme="dark"] .menu-close { color: #f9a8d4; }
html[data-theme="dark"] .menu-item { color: #f1d3e2; }
html[data-theme="dark"] .menu-item:hover, html[data-theme="dark"] .menu-item.active { background: rgba(244,114,182,0.18); color: #f9a8d4; }
html[data-theme="dark"] .menu-item > .n, html[data-theme="dark"] .menu-cat .n, html[data-theme="dark"] .menu-tag .n { background: rgba(244,114,182,0.2); color: #f9a8d4; }
html[data-theme="dark"] .menu-empty { color: #c98aa9; }
`;

const menuState = { videos: [], active: null, onPick: null, open: false, tagsOpen: true };
// active = { category: '', tag: '' } di halaman daftar, atau null di halaman lain
let menuEls = null;

function openMenu(open) {
    if (!menuEls) return;
    menuState.open = open;
    menuEls.overlay.classList.toggle('open', open);
    menuEls.drawer.classList.toggle('open', open);
    menuEls.drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
}

// type: 'home' | 'category' | 'tag'
function pickMenu(type, value) {
    openMenu(false);
    if (menuState.onPick) {
        menuState.onPick(type, value);
    } else if (type === 'category') {
        location.href = 'index.html?kategori=' + encodeURIComponent(value);
    } else if (type === 'tag') {
        location.href = 'index.html?tag=' + encodeURIComponent(value);
    } else {
        location.href = 'index.html';
    }
}

function renderMenu() {
    if (!menuEls) return;
    const body = menuEls.body;
    body.innerHTML = '';

    // Home = tampilkan semua video
    const home = document.createElement('a');
    const act = menuState.active;
    home.className = 'menu-item' + (act && !act.category && !act.tag ? ' active' : '');
    home.href = 'index.html';
    home.innerHTML = '<i class="fas fa-house lead"></i><span>Home</span>';
    home.addEventListener('click', e => { if (menuState.onPick) { e.preventDefault(); pickMenu('home', ''); } });
    body.appendChild(home);

    // Kategori: INDO, VIRAL, JAV
    const catCount = {};
    (menuState.videos || []).forEach(v => { const c = videoCategory(v); if (c) catCount[c] = (catCount[c] || 0) + 1; });
    CATEGORIES.forEach(c => {
        const el = document.createElement('a');
        el.className = 'menu-item menu-cat' + (act && act.category === c ? ' active' : '');
        el.href = 'index.html?kategori=' + encodeURIComponent(c);
        const name = document.createElement('span');
        name.textContent = c;
        const n = document.createElement('span');
        n.className = 'n';
        n.textContent = catCount[c] || 0;
        el.innerHTML = '<i class="fas fa-folder lead"></i>';
        el.append(name, n);
        el.addEventListener('click', e => { if (menuState.onPick) { e.preventDefault(); pickMenu('category', c); } });
        body.appendChild(el);
    });

    // Tag = menuju halaman daftar semua tag (tags.html)
    const tagSet = new Set();
    (menuState.videos || []).forEach(v => videoTags(v).forEach(g => tagSet.add(g.toLowerCase())));
    const tagLink = document.createElement('a');
    tagLink.className = 'menu-item' + (/tags\.html$/.test(location.pathname) ? ' active' : '');
    tagLink.href = 'tags.html';
    tagLink.innerHTML = '<i class="fas fa-tags lead"></i>';
    const tName = document.createElement('span');
    tName.textContent = 'Tag';
    const tN = document.createElement('span');
    tN.className = 'n';
    tN.textContent = tagSet.size;
    tagLink.append(tName, tN);
    body.appendChild(tagLink);
}

// videos: daftar video; active: { category, tag } yang sedang dipilih (null = bukan halaman daftar);
// onPick(type, value): dipanggil saat Home/kategori/tag diketuk (kalau kosong, pindah ke index.html)
function setMenuData(videos, active, onPick) {
    menuState.videos = videos || [];
    menuState.active = active;
    if (onPick) menuState.onPick = onPick;
    renderMenu();
}

function initMenu() {
    const btn = document.getElementById('menu-btn');
    if (!btn || menuEls) return;
    const style = document.createElement('style');
    style.textContent = MENU_CSS;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    const drawer = document.createElement('aside');
    drawer.className = 'menu-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('aria-label', 'Menu');
    drawer.innerHTML = '<div class="menu-head"><span>MENU</span><button type="button" class="menu-close" aria-label="Tutup menu"><i class="fas fa-xmark"></i></button></div><nav class="menu-body"></nav>';
    document.body.append(overlay, drawer);
    menuEls = { overlay, drawer, body: drawer.querySelector('.menu-body') };

    btn.addEventListener('click', () => openMenu(!menuState.open));
    overlay.addEventListener('click', () => openMenu(false));
    drawer.querySelector('.menu-close').addEventListener('click', () => openMenu(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuState.open) openMenu(false); });
    renderMenu();
}
initMenu();
