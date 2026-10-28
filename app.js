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
