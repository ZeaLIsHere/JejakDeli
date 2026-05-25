document.addEventListener('DOMContentLoaded', function () {
    loadSites();
    loadTrails();
    loadExplorerState();
});

var allSites = [];
var allTrails = [];
var map = null;
var markers = {};

function showPage(name) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    document.getElementById('page-' + name).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
    var link = document.querySelector('.nav-link[data-page="' + name + '"]');
    if (link) link.classList.add('active');
    window.scrollTo(0, 0);
    if (name === 'beranda' && map) {
        setTimeout(function () { map.invalidateSize(); }, 100);
    }
}

function showToast(title, message, type) {
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<div class="toast-title">' + title + '</div><div class="toast-message">' + message + '</div>';
    container.appendChild(toast);
    setTimeout(function () {
        toast.classList.add('removing');
        setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
}

function loadSites() {
    fetch('/api/sites').then(function (r) { return r.json(); }).then(function (sites) {
        allSites = sites;
        document.getElementById('totalSites').textContent = sites.length;
        document.getElementById('heroTotalSites').textContent = sites.length;
        renderSites(sites);
        initMap(sites);
    });
}

function renderSites(sites) {
    var grid = document.getElementById('siteGrid');
    grid.innerHTML = '';
    for (var i = 0; i < sites.length; i++) {
        var s = sites[i];
        var card = document.createElement('div');
        card.className = 'site-card';
        card.setAttribute('data-site-id', s.id);
        card.innerHTML =
            '<div class="visited-badge">Sudah Dikunjungi</div>' +
            '<div class="site-card-header">' +
            '<span class="site-id">' + s.id + '</span>' +
            '<span class="site-status">' + s.status + '</span>' +
            '</div>' +
            '<h3>' + s.name + '</h3>' +
            '<div class="site-era">' + s.era + '</div>' +
            '<p class="site-description">' + s.description + '</p>' +
            '<div class="site-coords">' + s.latitude + ', ' + s.longitude + '</div>' +
            '<button class="btn-visit" onclick="visitSite(\'' + s.id + '\')">Kunjungi Situs</button>';
        grid.appendChild(card);
    }
}

function loadTrails() {
    fetch('/api/trails').then(function (r) { return r.json(); }).then(function (trails) {
        allTrails = trails;
        document.getElementById('heroTotalTrails').textContent = trails.length;
        var list = document.getElementById('trailList');
        list.innerHTML = '';
        for (var i = 0; i < trails.length; i++) {
            var t = trails[i];
            var card = document.createElement('div');
            card.className = 'trail-card';
            var routeHtml = '';
            for (var j = 0; j < t.route.length; j++) {
                routeHtml += '<span class="route-stop">' + t.route[j].name + '</span>';
                if (j < t.route.length - 1) {
                    routeHtml += '<span class="route-arrow">&rarr;</span>';
                }
            }
            card.innerHTML =
                '<h3>' + t.name + '</h3>' +
                '<div class="trail-meta">' + t.route.length + ' situs dalam rute ini</div>' +
                '<div class="trail-route">' + routeHtml + '</div>' +
                '<button class="btn-trail" onclick="followTrail(\'' + t.id + '\')">Ikuti Trail Ini</button>';
            list.appendChild(card);
        }
    });
}

function loadExplorerState() {
    fetch('/api/explorer').then(function (r) { return r.json(); }).then(function (d) { updateUI(d); });
}

function updateUI(data) {
    var visited = data.visitedSites || [];
    document.getElementById('visitedCount').textContent = visited.length;
    document.getElementById('heroVisited').textContent = visited.length;
    document.getElementById('explorerName').textContent = data.name || 'Explorer';
    document.getElementById('currentLocation').textContent = data.currentLocation ? data.currentLocation.name : 'Belum ada';

    var list = document.getElementById('historyList');
    list.innerHTML = '';
    if (visited.length === 0) {
        list.innerHTML = '<div class="history-empty">Belum ada situs yang dikunjungi. Kunjungi situs melalui halaman Situs atau ikuti Trail.</div>';
    } else {
        for (var i = 0; i < visited.length; i++) {
            var s = visited[i];
            var li = document.createElement('li');
            li.innerHTML =
                '<span class="history-number">' + (i + 1) + '</span>' +
                '<div class="history-site-info">' +
                '<strong>' + s.name + '</strong>' +
                '<span>' + s.era + ' - ' + s.status + '</span>' +
                '</div>';
            list.appendChild(li);
        }
    }

    document.querySelectorAll('.site-card').forEach(function (card) {
        var sid = card.getAttribute('data-site-id');
        var found = false;
        for (var j = 0; j < visited.length; j++) { if (visited[j].id === sid) { found = true; break; } }
        if (found) { card.classList.add('visited'); } else { card.classList.remove('visited'); }
    });
    updateMapMarkers(visited);

    var badges = data.earnedBadges || [];
    document.getElementById('badgeCount').textContent = badges.length;
    renderBadges(badges);
}

function handleNewBadges(newBadges) {
    if (newBadges && newBadges.length > 0) {
        for (var i = 0; i < newBadges.length; i++) {
            showToast('Badge Diperoleh!', 'Anda mendapatkan badge "' + newBadges[i].name + '"', 'success');
        }
    }
}

function visitSite(siteId) {
    fetch('/api/visit/' + siteId, { method: 'POST' }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.success) {
            showToast('Kunjungan Berhasil', d.message, 'success');
            handleNewBadges(d.newBadges);
            loadExplorerState();
        }
        else { showToast('Tidak Dapat Mengunjungi', d.message, 'error'); }
    }).catch(function () { showToast('Error', 'Terjadi kesalahan pada server.', 'error'); });
}

function followTrail(trailId) {
    fetch('/api/trail/' + trailId, { method: 'POST' }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.success) {
            showTrailResultModal(d);
            handleNewBadges(d.newBadges);
            loadExplorerState();
        }
        else { showToast('Error', d.message, 'error'); }
    }).catch(function () { showToast('Error', 'Terjadi kesalahan pada server.', 'error'); });
}

function showTrailResultModal(data) {
    var overlay = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = data.trailName;
    document.getElementById('modalSubtitle').textContent = data.message;
    var body = document.getElementById('modalBody');
    body.innerHTML = '';
    var details = data.details || [];
    for (var i = 0; i < details.length; i++) {
        var d = details[i];
        var cls = d.action === 'VISITED' ? 'visited' : 'skipped';
        var txt = d.action === 'VISITED' ? 'V' : 'S';
        var item = document.createElement('div');
        item.className = 'trail-result-item';
        item.innerHTML = '<div class="result-icon ' + cls + '">' + txt + '</div><div class="result-info"><strong>' + d.siteName + '</strong><span>' + d.reason + '</span></div>';
        body.appendChild(item);
    }
    overlay.classList.add('active');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

function resetExplorer() {
    fetch('/api/reset', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.success) { showToast('Reset Berhasil', d.message, 'info'); loadExplorerState(); }
    }).catch(function () { showToast('Error', 'Terjadi kesalahan pada server.', 'error'); });
}

function initMap(sites) {
    map = L.map('map').setView([3.5833, 98.6833], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    var yellowIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    for (var i = 0; i < sites.length; i++) {
        var s = sites[i];
        var marker = L.marker([s.latitude, s.longitude], { icon: yellowIcon }).addTo(map);
        marker.bindPopup('<strong>' + s.name + '</strong><br>' + s.era + '<br><em>' + s.status + '</em>');
        markers[s.id] = marker;
    }
}

function updateMapMarkers(visitedSites) {
    if (!map) return;
    var greenIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    var yellowIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    var visitedIds = {};
    for (var i = 0; i < visitedSites.length; i++) { visitedIds[visitedSites[i].id] = true; }
    for (var id in markers) {
        if (visitedIds[id]) { markers[id].setIcon(greenIcon); }
        else { markers[id].setIcon(yellowIcon); }
    }
}

var badgeDefs = [
    { id: 'B01', name: 'Penjelajah Kesultanan', description: 'Menyelesaikan Trail Jejak Kesultanan Deli' },
    { id: 'B02', name: 'Penjelajah Kolonial', description: 'Menyelesaikan Trail Jejak Kolonial Medan' },
    { id: 'B03', name: 'Penjelajah Multikultur', description: 'Menyelesaikan Trail Jejak Multikultur Medan' }
];

function renderBadges(earnedBadges) {
    var grid = document.getElementById('badgesGrid');
    grid.innerHTML = '';
    var earnedIds = {};
    for (var i = 0; i < earnedBadges.length; i++) { earnedIds[earnedBadges[i].id] = true; }
    for (var j = 0; j < badgeDefs.length; j++) {
        var b = badgeDefs[j];
        var isEarned = earnedIds[b.id] === true;
        var item = document.createElement('div');
        item.className = 'badge-item ' + (isEarned ? 'earned' : 'locked');
        var iconText = isEarned ? 'B' + (j + 1) : '?';
        var statusText = isEarned ? 'Diperoleh' : 'Terkunci';
        item.innerHTML =
            '<div class="badge-icon">' + iconText + '</div>' +
            '<div class="badge-info"><strong>' + b.name + '</strong><span>' + b.description + '</span></div>' +
            '<span class="badge-status">' + statusText + '</span>';
        grid.appendChild(item);
    }
}
