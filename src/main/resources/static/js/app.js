document.addEventListener('DOMContentLoaded', function () {
    checkLoginStatus();
});

var allSites = [];
var allTrails = [];
var allBadges = [];
var map = null;
var markers = {};
var currentQuizSiteId = null;
var currentDetailSiteId = null;
var currentExplorerName = "";

function checkLoginStatus() {
    fetch('/api/auth/status')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.loggedIn) {
                showApp(data.username);
            } else {
                showAuth();
            }
        })
        .catch(function() {
            showAuth();
        });
}

function showApp(username) {
    currentExplorerName = username;
    document.getElementById('page-auth').style.display = 'none';
    document.getElementById('appNavbar').style.display = 'block';
    document.getElementById('appMainContent').style.display = 'block';
    
    // Load initial app data
    loadSites();
    loadTrails();
    loadBadges();
    loadExplorerState();
}

function showAuth() {
    currentExplorerName = "";
    document.getElementById('page-auth').style.display = 'flex';
    document.getElementById('appNavbar').style.display = 'none';
    document.getElementById('appMainContent').style.display = 'none';
    
    // Clear forms
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
}

function toggleAuthForm(isRegister) {
    if (isRegister) {
        document.getElementById('authTitle').textContent = 'Daftar Akun JejakDeli';
        document.getElementById('authSubtitle').textContent = 'Buat akun penjelajah baru untuk merekam riwayat perjalanan Anda';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    } else {
        document.getElementById('authTitle').textContent = 'Masuk ke JejakDeli';
        document.getElementById('authSubtitle').textContent = 'Masuk untuk memulai petualangan sejarah Anda di kota Medan';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }
}

function submitLogin(event) {
    event.preventDefault();
    var u = document.getElementById('loginUsername').value;
    var p = document.getElementById('loginPassword').value;

    var url = '/api/auth/login?username=' + encodeURIComponent(u) + '&password=' + encodeURIComponent(p);

    fetch(url, { method: 'POST' })
        .then(function(r) { return r.json().then(data => ({ status: r.status, body: data })); })
        .then(function(res) {
            if (res.status === 200) {
                showToast('Login Berhasil', res.body.message, 'success');
                showApp(res.body.username);
            } else {
                showToast('Login Gagal', res.body.message || 'Username atau password salah.', 'error');
            }
        })
        .catch(function() {
            showToast('Eror', 'Terjadi kesalahan sistem saat mencoba login.', 'error');
        });
}

function submitRegister(event) {
    event.preventDefault();
    var u = document.getElementById('registerUsername').value;
    var p = document.getElementById('registerPassword').value;

    var url = '/api/auth/register?username=' + encodeURIComponent(u) + '&password=' + encodeURIComponent(p);

    fetch(url, { method: 'POST' })
        .then(function(r) { return r.json().then(data => ({ status: r.status, body: data })); })
        .then(function(res) {
            if (res.status === 200) {
                showToast('Registrasi Berhasil', res.body.message, 'success');
                toggleAuthForm(false); // Switch to login form
                document.getElementById('loginUsername').value = u; // Autofill username
            } else {
                showToast('Registrasi Gagal', res.body.message || 'Gagal mendaftarkan akun.', 'error');
            }
        })
        .catch(function() {
            showToast('Eror', 'Terjadi kesalahan sistem saat mendaftar.', 'error');
        });
}

function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(function() {
            showToast('Selesai', 'Anda berhasil logout.', 'info');
            showAuth();
        })
        .catch(function() {
            showAuth();
        });
}

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

// 4. SEARCH & FILTER SITES
function loadSites() {
    filterSites();
}

function filterSites() {
    var search = document.getElementById('searchSite') ? document.getElementById('searchSite').value : '';
    var category = document.getElementById('filterCategory') ? document.getElementById('filterCategory').value : 'all';
    
    var url = '/api/sites?search=' + encodeURIComponent(search) + '&category=' + encodeURIComponent(category);
    
    fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (sites) {
            allSites = sites;
            renderSites(sites);
            initMap(sites);
        });
}

function renderSites(sites) {
    var grid = document.getElementById('siteGrid');
    grid.innerHTML = '';
    
    if (sites.length === 0) {
        grid.innerHTML = '<div class="history-empty" style="grid-column: 1/-1;">Situs tidak ditemukan. Coba kata kunci atau kategori lain.</div>';
        return;
    }
    
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
            '<div class="site-buttons" style="display:flex; gap:8px;">' +
                '<button class="btn-visit" onclick="openQuizModal(\'' + s.id + '\')">Kunjungi & Kuis</button>' +
                '<button class="btn-visit detail-btn" style="background-color: var(--teal); display:none;" onclick="openSiteDetailModal(\'' + s.id + '\')">Detail & Ulasan</button>' +
            '</div>';
        grid.appendChild(card);
    }
    loadExplorerState();
}

function loadTrails() {
    fetch('/api/trails')
        .then(function(r) { return handleApiResponse(r); })
        .then(function (trails) {
            if (!trails) return;
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

function loadBadges() {
    fetch('/api/badges')
        .then(function(r) { return handleApiResponse(r); })
        .then(function (badges) {
            if (!badges) return;
            allBadges = badges;
            if (document.getElementById('badgeCount').textContent !== '0') {
                loadExplorerState();
            }
        });
}

function loadExplorerState() {
    fetch('/api/explorer')
        .then(function(r) { return handleApiResponse(r); })
        .then(function (d) { 
            if (d) updateUI(d); 
        });
}

function handleApiResponse(r) {
    if (r.status === 401) {
        showToast('Sesi Berakhir', 'Silakan masuk kembali.', 'info');
        showAuth();
        return null;
    }
    return r.json();
}

// 1. XP PROGRESS BAR & LEVEL UP VISUALS
function updateUI(data) {
    var visited = data.visitedSites || [];
    
    document.getElementById('visitedCount').textContent = visited.length;
    document.getElementById('heroVisited').textContent = visited.length;
    document.getElementById('explorerName').textContent = currentExplorerName;
    document.getElementById('currentLocation').textContent = data.currentLocation ? data.currentLocation.name : 'Belum ada';

    document.getElementById('totalSites').textContent = allSites.length > 0 ? allSites.length : 10;
    document.getElementById('heroTotalSites').textContent = allSites.length > 0 ? allSites.length : 10;

    var lvl = data.level || 1;
    var xp = data.xp || 0;
    document.getElementById('explorerLevel').textContent = lvl;
    document.getElementById('explorerXp').textContent = xp;
    
    var title = "Turis Pemula";
    if (lvl === 2) title = "Penjelajah Lokal";
    else if (lvl === 3) title = "Penyelidik Sejarah";
    else if (lvl >= 4) title = "Ksatria Deli";
    document.getElementById('explorerTitle').textContent = title;

    var progressXp = xp % 300;
    var percentage = (progressXp / 300) * 100;
    document.getElementById('xpProgressBar').style.width = percentage + '%';

    var list = document.getElementById('historyList');
    list.innerHTML = '';
    if (visited.length === 0) {
        list.innerHTML = '<div class="history-empty">Belum ada situs yang dikunjungi. Kunjungi situs melalui kuis di halaman Situs atau ikuti Trail.</div>';
    } else {
        for (var i = 0; i < visited.length; i++) {
            var s = visited[i];
            var li = document.createElement('li');
            li.innerHTML =
                '<span class="history-number">' + (i + 1) + '</span>' +
                '<div class="history-site-info">' +
                '<strong>' + s.name + '</strong>' +
                '<span>' + s.era + ' - ' + s.status + '</span>' +
                '</div>' +
                '<button class="btn-visit" style="padding: 4px 10px; font-size: 11px; background-color: var(--teal);" onclick="openSiteDetailModal(\'' + s.id + '\')">Detail</button>';
            list.appendChild(li);
        }
    }

    var visitedIds = {};
    for (var k = 0; k < visited.length; k++) { visitedIds[visited[k].id] = true; }

    document.querySelectorAll('.site-card').forEach(function (card) {
        var sid = card.getAttribute('data-site-id');
        var isVisited = visitedIds[sid] === true;
        
        if (isVisited) {
            card.classList.add('visited');
            card.querySelector('.btn-visit').style.display = 'none';
            if (card.querySelector('.detail-btn')) {
                card.querySelector('.detail-btn').style.display = 'inline-block';
            }
        } else {
            card.classList.remove('visited');
            card.querySelector('.btn-visit').style.display = 'inline-block';
            if (card.querySelector('.detail-btn')) {
                card.querySelector('.detail-btn').style.display = 'none';
            }
        }
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

// 1. KUIS MODAL LOGIC
function openQuizModal(siteId) {
    currentQuizSiteId = siteId;
    var site = allSites.find(function(s) { return s.id === siteId; });
    if (!site || !site.quiz) {
        showToast('Info', 'Situs ini tidak memiliki kuis, langsung mengunjungi...', 'info');
        submitQuizAnswer('');
        return;
    }

    document.getElementById('quizSiteName').textContent = site.name;
    document.getElementById('quizQuestionText').textContent = site.quiz.questionText;
    document.getElementById('optionA').textContent = 'A. ' + site.quiz.optionA;
    document.getElementById('optionB').textContent = 'B. ' + site.quiz.optionB;
    document.getElementById('optionC').textContent = 'C. ' + site.quiz.optionC;
    document.getElementById('optionD').textContent = 'D. ' + site.quiz.optionD;

    document.getElementById('quizModalOverlay').classList.add('active');
}

function closeQuizModal() {
    document.getElementById('quizModalOverlay').classList.remove('active');
    currentQuizSiteId = null;
}

function submitQuizAnswer(answerLetter) {
    if (!currentQuizSiteId) return;

    fetch('/api/visit/' + currentQuizSiteId + '?answer=' + answerLetter, { method: 'POST' })
        .then(function (r) {
            if (r.status === 401) {
                closeQuizModal();
                showAuth();
                return Promise.reject('Unauthorized');
            }
            return r.json().then(data => ({ status: r.status, body: data }));
        })
        .then(function (res) {
            if (res.status === 200) {
                var d = res.body;
                showToast('Kunjungan Berhasil', d.message, 'success');
                if (d.leveledUp) {
                    showToast('🎉 NAIK LEVEL!', 'Selamat! Level Anda naik menjadi Level ' + d.newLevel, 'info');
                }
                handleNewBadges(d.newBadges);
                closeQuizModal();
                loadExplorerState();
            } else {
                showToast('Eror Kunjungan', res.body.message || 'Jawaban Anda salah.', 'error');
            }
        })
        .catch(function (err) { 
            if (err !== 'Unauthorized') {
                showToast('Eror', 'Terjadi kesalahan komunikasi dengan server.', 'error'); 
            }
        });
}

// 3. REVIEWS & DETAILS MODAL
function openSiteDetailModal(siteId) {
    currentDetailSiteId = siteId;
    var site = allSites.find(function(s) { return s.id === siteId; });
    if (!site) return;

    document.getElementById('detailSiteName').textContent = site.name;
    document.getElementById('detailSiteId').textContent = site.id;
    document.getElementById('detailSiteEra').textContent = site.era;
    document.getElementById('detailSiteDesc').textContent = site.description;

    loadSiteReviews(siteId);

    document.getElementById('siteDetailModalOverlay').classList.add('active');
}

function closeSiteDetailModal() {
    document.getElementById('siteDetailModalOverlay').classList.remove('active');
    currentDetailSiteId = null;
    document.getElementById('newReviewComment').value = '';
}

function loadSiteReviews(siteId) {
    var list = document.getElementById('detailReviewsList');
    list.innerHTML = '<div class="history-empty">Memuat ulasan...</div>';

    fetch('/api/sites/' + siteId + '/reviews')
        .then(function(r) { return r.json(); })
        .then(function(reviews) {
            list.innerHTML = '';
            if (reviews.length === 0) {
                list.innerHTML = '<div class="history-empty">Belum ada ulasan untuk situs ini. Jadilah yang pertama memberikan ulasan!</div>';
                return;
            }

            for (var i = 0; i < reviews.length; i++) {
                var r = reviews[i];
                var item = document.createElement('div');
                item.className = 'review-item';
                
                var stars = '';
                for (var s = 0; s < r.rating; s++) { stars += '⭐'; }
                
                var dateFormatted = r.createdAt ? r.createdAt.substring(0, 10) + ' ' + r.createdAt.substring(11, 16) : '';
                var authorName = r.explorer ? r.explorer.username : 'Anonim';

                item.innerHTML = 
                    '<div class="review-header">' +
                        '<span class="review-author">' + authorName + '</span>' +
                        '<span class="review-date">' + dateFormatted + '</span>' +
                    '</div>' +
                    '<div class="review-stars">' + stars + '</div>' +
                    '<p class="review-comment">' + r.comment + '</p>';
                list.appendChild(item);
            }
        });
}

function submitReview() {
    if (!currentDetailSiteId) return;

    var rating = document.getElementById('newReviewRating').value;
    var comment = document.getElementById('newReviewComment').value;

    if (!comment.trim()) {
        showToast('Validasi Gagal', 'Komentar ulasan tidak boleh kosong.', 'error');
        return;
    }

    var url = '/api/sites/' + currentDetailSiteId + '/reviews?rating=' + rating + '&comment=' + encodeURIComponent(comment);

    fetch(url, { method: 'POST' })
        .then(function(r) {
            if (r.status === 401) {
                closeSiteDetailModal();
                showAuth();
                return Promise.reject('Unauthorized');
            }
            return r.json();
        })
        .then(function() {
            showToast('Ulasan Dikirim', 'Catatan perjalanan berhasil disimpan!', 'success');
            document.getElementById('newReviewComment').value = '';
            loadSiteReviews(currentDetailSiteId);
        })
        .catch(function(err) {
            if (err !== 'Unauthorized') {
                showToast('Eror', 'Gagal mengirimkan ulasan.', 'error');
            }
        });
}

function followTrail(trailId) {
    fetch('/api/trail/' + trailId, { method: 'POST' })
        .then(function (r) {
            if (r.status === 401) {
                showAuth();
                return Promise.reject('Unauthorized');
            }
            return r.json();
        })
        .then(function (d) {
            showTrailResultModal(d);
            if (d.leveledUp) {
                showToast('🎉 NAIK LEVEL!', 'Selamat! Level Anda naik menjadi Level ' + d.newLevel, 'info');
            }
            handleNewBadges(d.newBadges);
            loadExplorerState();
        })
        .catch(function (err) {
            if (err !== 'Unauthorized') {
                showToast('Error', 'Terjadi kesalahan pada server.', 'error');
            }
        });
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
    fetch('/api/reset', { method: 'POST' })
        .then(function (r) {
            if (r.status === 401) {
                showAuth();
                return Promise.reject('Unauthorized');
            }
            return r.json();
        })
        .then(function (d) {
            showToast('Reset Berhasil', d.message, 'info'); 
            loadExplorerState(); 
        })
        .catch(function (err) {
            if (err !== 'Unauthorized') {
                showToast('Error', 'Terjadi kesalahan pada server.', 'error');
            }
        });
}

function initMap(sites) {
    var mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    if (map !== null) {
        map.remove();
        map = null;
        markers = {};
    }

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
    setTimeout(function() {
        if (map) {
            map.invalidateSize();
        }
    }, 100);
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

function renderBadges(earnedBadges) {
    var grid = document.getElementById('badgesGrid');
    grid.innerHTML = '';
    
    if (allBadges.length === 0) {
        grid.innerHTML = '<div class="history-empty">Memuat daftar badge...</div>';
        return;
    }

    var earnedIds = {};
    for (var i = 0; i < earnedBadges.length; i++) { earnedIds[earnedBadges[i].id] = true; }
    for (var j = 0; j < allBadges.length; j++) {
        var b = allBadges[j];
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
