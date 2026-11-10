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

// Genre: terima teks "a, b, c" atau array, kembalikan array bersih (maks 8, tiap genre maks 20 huruf)
function parseGenres(input) {
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

function videoGenres(v) {
    return Array.isArray(v && v.genres) ? parseGenres(v.genres) : [];
}
