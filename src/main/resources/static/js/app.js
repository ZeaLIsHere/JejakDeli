document.addEventListener("DOMContentLoaded", function () {
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
var currentIsAdmin = false;
var customRouteTargetId = null;
var routeExpPoints = [];
var routeExpMarkers = {};

// ---- Geofencing / Location Tracking ----
var locationWatcher = null;
var isTracking = false;
var userLocationMarker = null;
var geofenceCircles = [];
var lastCheckinTime = 0;
var GEOFENCE_RADIUS_M = 100;
var CHECKIN_COOLDOWN_MS = 10000; // min 10 detik antar panggilan backend

// ---- Halaman Jelajah (Pokémon GO Style) ----
var jelajahMap = null;
var jelajahPlayerMarker = null;
var jelajahSiteMarkers = {};
var jelajahDirLine = null;
var isARMode = false;
var arStream = null;
var arRafId = null;
var deviceHeading = 0;
var arrivalAlertTimer = null;
var jelajahRouteLayer = null; // rute jalan OSRM
var lastRouteTargetId = null; // ID situs tujuan terakhir
var routeFetchTimer = null; // debounce fetch OSRM

// ---- Trail Mode ----
var activeTrailId = null; // ID trail yang sedang aktif di Jelajah
var activeTrailSiteIndex = 0; // Indeks waypoint trail saat ini

function checkLoginStatus() {
  fetch("/api/auth/status")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      if (data.loggedIn) {
        showApp(data.username, data.isAdmin);
      } else {
        showAuth();
      }
    })
    .catch(function () {
      showAuth();
    });
}

function showApp(username, isAdmin) {
  currentExplorerName = username;
  currentIsAdmin = !!isAdmin;
  document.getElementById("page-auth").style.display = "none";
  document.getElementById("appNavbar").style.display = "block";
  document.getElementById("appMainContent").style.display = "block";

  // Tampilkan/sembunyikan link Admin di navbar
  var navAdminLink = document.getElementById("navAdminLink");
  if (navAdminLink)
    navAdminLink.style.display = currentIsAdmin ? "list-item" : "none";

  // Load initial app data
  loadSites();
  loadTrails();
  loadBadges();
  loadExplorerState();

  // Mulai pelacakan GPS otomatis saat login
  startLocationTracking();
}

function showAuth() {
  stopLocationTracking();
  currentExplorerName = "";
  document.getElementById("page-auth").style.display = "flex";
  document.getElementById("appNavbar").style.display = "none";
  document.getElementById("appMainContent").style.display = "none";

  // Clear forms
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("registerUsername").value = "";
  document.getElementById("registerPassword").value = "";
}

function toggleAuthForm(isRegister) {
  if (isRegister) {
    document.getElementById("authTitle").textContent = "Daftar Akun JejakDeli";
    document.getElementById("authSubtitle").textContent =
      "Buat akun penjelajah baru untuk merekam riwayat perjalanan Anda";
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("registerForm").style.display = "block";
  } else {
    document.getElementById("authTitle").textContent = "Masuk ke JejakDeli";
    document.getElementById("authSubtitle").textContent =
      "Masuk untuk memulai petualangan sejarah Anda di kota Medan";
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("registerForm").style.display = "none";
  }
}

function submitLogin(event) {
  event.preventDefault();
  var u = document.getElementById("loginUsername").value;
  var p = document.getElementById("loginPassword").value;

  var url =
    "/api/auth/login?username=" +
    encodeURIComponent(u) +
    "&password=" +
    encodeURIComponent(p);

  fetch(url, { method: "POST" })
    .then(function (r) {
      return r.json().then((data) => ({ status: r.status, body: data }));
    })
    .then(function (res) {
      if (res.status === 200) {
        showToast("Login Berhasil", res.body.message, "success");
        showApp(res.body.username, res.body.isAdmin);
      } else {
        showToast(
          "Login Gagal",
          res.body.message || "Username atau password salah.",
          "error",
        );
      }
    })
    .catch(function () {
      showToast(
        "Eror",
        "Terjadi kesalahan sistem saat mencoba login.",
        "error",
      );
    });
}

function submitRegister(event) {
  event.preventDefault();
  var u = document.getElementById("registerUsername").value;
  var p = document.getElementById("registerPassword").value;

  var url =
    "/api/auth/register?username=" +
    encodeURIComponent(u) +
    "&password=" +
    encodeURIComponent(p);

  fetch(url, { method: "POST" })
    .then(function (r) {
      return r.json().then((data) => ({ status: r.status, body: data }));
    })
    .then(function (res) {
      if (res.status === 200) {
        showToast("Registrasi Berhasil", res.body.message, "success");
        toggleAuthForm(false); // Switch to login form
        document.getElementById("loginUsername").value = u; // Autofill username
      } else {
        showToast(
          "Registrasi Gagal",
          res.body.message || "Gagal mendaftarkan akun.",
          "error",
        );
      }
    })
    .catch(function () {
      showToast("Eror", "Terjadi kesalahan sistem saat mendaftar.", "error");
    });
}

function handleLogout() {
  var hamburger = document.getElementById("navHamburger");
  var navLinks = document.querySelector(".nav-links");
  if (hamburger) hamburger.classList.remove("open");
  if (navLinks) navLinks.classList.remove("open");
  fetch("/api/auth/logout", { method: "POST" })
    .then(function () {
      showToast("Selesai", "Anda berhasil logout.", "info");
      showAuth();
    })
    .catch(function () {
      showAuth();
    });
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.remove("active");
  });
  document.getElementById("page-" + name).classList.add("active");
  document.querySelectorAll(".nav-link").forEach(function (l) {
    l.classList.remove("active");
  });
  var link = document.querySelector('.nav-link[data-page="' + name + '"]');
  if (link) link.classList.add("active");
  window.scrollTo(0, 0);
  // Tutup mobile menu jika terbuka
  var hamburger = document.getElementById("navHamburger");
  var navLinks = document.querySelector(".nav-links");
  if (hamburger) hamburger.classList.remove("open");
  if (navLinks) navLinks.classList.remove("open");
  if (name === "beranda" && map) {
    setTimeout(function () {
      map.invalidateSize();
    }, 100);
  }
  if (name === "jelajah") {
    setTimeout(function () {
      initJelajahPage();
    }, 150);
  }
}

function toggleMobileMenu() {
  var hamburger = document.getElementById("navHamburger");
  var navLinks = document.querySelector(".nav-links");
  if (!hamburger || !navLinks) return;
  var isOpen = hamburger.classList.toggle("open");
  navLinks.classList.toggle("open", isOpen);
}

// Tutup menu mobile saat klik di luar navbar
document.addEventListener("click", function (e) {
  var navbar = document.getElementById("appNavbar");
  if (navbar && !navbar.contains(e.target)) {
    var hamburger = document.getElementById("navHamburger");
    var navLinks = document.querySelector(".nav-links");
    if (hamburger) hamburger.classList.remove("open");
    if (navLinks) navLinks.classList.remove("open");
  }
});

function showToast(title, message, type) {
  var container = document.getElementById("toastContainer");
  var toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.innerHTML =
    '<div class="toast-title">' +
    title +
    '</div><div class="toast-message">' +
    message +
    "</div>";
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add("removing");
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 3500);
}

// 4. SEARCH & FILTER SITES
function loadSites() {
  filterSites();
}

function filterSites() {
  var search = document.getElementById("searchSite")
    ? document.getElementById("searchSite").value
    : "";
  var category = document.getElementById("filterCategory")
    ? document.getElementById("filterCategory").value
    : "all";

  var url =
    "/api/sites?search=" +
    encodeURIComponent(search) +
    "&category=" +
    encodeURIComponent(category);

  fetch(url)
    .then(function (r) {
      return r.json();
    })
    .then(function (sites) {
      allSites = sites;
      renderSites(sites);
      initMap(sites);
    });
}

function renderSites(sites) {
  var grid = document.getElementById("siteGrid");
  grid.innerHTML = "";

  if (sites.length === 0) {
    grid.innerHTML =
      '<div class="history-empty" style="grid-column: 1/-1;">Situs tidak ditemukan. Coba kata kunci atau kategori lain.</div>';
    return;
  }

  for (var i = 0; i < sites.length; i++) {
    var s = sites[i];
    var card = document.createElement("div");
    card.className = "site-card";
    card.setAttribute("data-site-id", s.id);

    card.innerHTML =
      '<div class="site-card-header">' +
      '<span class="site-id">' +
      s.id +
      "</span>" +
      '<span class="visited-badge">Sudah Dikunjungi</span>' +
      "</div>" +
      (s.imageUrl
        ? '<img src="' +
          s.imageUrl +
          '" class="site-card-img" alt="' +
          s.name +
          '">'
        : "") +
      "<h3>" +
      s.name +
      "</h3>" +
      '<div class="site-era">' +
      s.era +
      "</div>" +
      '<p class="site-description">' +
      s.description +
      "</p>" +
      '<div class="site-meta-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">' +
      '<div class="site-coords" style="margin-bottom:0;">' +
      s.latitude +
      ", " +
      s.longitude +
      "</div>" +
      '<span class="site-status">' +
      s.status +
      "</span>" +
      "</div>" +
      '<div class="site-card-bottom" style="display:flex; justify-content:space-between; align-items:center; width:100%;">' +
      '<div class="site-buttons" style="display:flex; justify-content:space-between; align-items:center; width:100%;">' +
      '<button class="btn-visit" onclick="openQuizModal(\'' +
      s.id +
      "')\">Kunjungi & Kuis</button>" +
      '<button class="btn-visit detail-btn" style="background-color: var(--teal); display:none;" onclick="openSiteDetailModal(\'' +
      s.id +
      "')\">Detail & Ulasan</button>" +
      '<button class="btn-more" onclick="openSiteDetailModal(\'' +
      s.id +
      "')\">Selengkapnya &rarr;</button>" +
      "</div>" +
      "</div>";
    grid.appendChild(card);
  }
  loadExplorerState();
}

function loadTrails() {
  fetch("/api/trails")
    .then(function (r) {
      return handleApiResponse(r);
    })
    .then(function (trails) {
      if (!trails) return;
      allTrails = trails;
      document.getElementById("heroTotalTrails").textContent = trails.length;
      var list = document.getElementById("trailList");
      list.innerHTML = "";
      for (var i = 0; i < trails.length; i++) {
        var t = trails[i];
        var card = document.createElement("div");
        card.className = "trail-card";
        var routeHtml = "";
        for (var j = 0; j < t.route.length; j++) {
          routeHtml +=
            '<span class="route-stop">' + t.route[j].name + "</span>";
          if (j < t.route.length - 1) {
            routeHtml += '<span class="route-arrow">&rarr;</span>';
          }
        }
        card.innerHTML =
          "<h3>" +
          t.name +
          "</h3>" +
          '<div class="trail-meta">' +
          t.route.length +
          " situs dalam rute ini</div>" +
          '<div class="trail-route">' +
          routeHtml +
          "</div>" +
          '<button class="btn-trail" onclick="followTrail(\'' +
          t.id +
          "')\">Ikuti Trail Ini</button>";
        list.appendChild(card);
      }
    });
}

function loadBadges() {
  fetch("/api/badges")
    .then(function (r) {
      return handleApiResponse(r);
    })
    .then(function (badges) {
      if (!badges) return;
      allBadges = badges;
      if (document.getElementById("badgeCount").textContent !== "0") {
        loadExplorerState();
      }
    });
}

function loadExplorerState() {
  fetch("/api/explorer")
    .then(function (r) {
      return handleApiResponse(r);
    })
    .then(function (d) {
      if (d) updateUI(d);
    });
}

function handleApiResponse(r) {
  if (r.status === 401) {
    showToast("Sesi Berakhir", "Silakan masuk kembali.", "info");
    showAuth();
    return null;
  }
  return r.json();
}

// 1. XP PROGRESS BAR & LEVEL UP VISUALS
function updateUI(data) {
  var visited = data.visitedSites || [];

  document.getElementById("visitedCount").textContent = visited.length;
  document.getElementById("heroVisited").textContent = visited.length;
  document.getElementById("explorerName").textContent = currentExplorerName;

  // Tampilkan badge Admin di kartu profil jika admin
  var roleBadge = document.getElementById("explorerRoleBadge");
  if (roleBadge)
    roleBadge.style.display = currentIsAdmin ? "inline-block" : "none";

  document.getElementById("currentLocation").textContent = data.currentLocation
    ? data.currentLocation.name
    : "Belum ada";

  document.getElementById("totalSites").textContent =
    allSites.length > 0 ? allSites.length : 10;
  document.getElementById("heroTotalSites").textContent =
    allSites.length > 0 ? allSites.length : 10;

  var lvl = data.level || 1;
  var xp = data.xp || 0;
  document.getElementById("explorerLevel").textContent = lvl;
  document.getElementById("explorerXp").textContent = xp;

  var title = "Turis Pemula";
  if (lvl === 2) title = "Penjelajah Lokal";
  else if (lvl === 3) title = "Penyelidik Sejarah";
  else if (lvl >= 4) title = "Ksatria Deli";
  document.getElementById("explorerTitle").textContent = title;

  var progressXp = xp % 300;
  var percentage = (progressXp / 300) * 100;
  document.getElementById("xpProgressBar").style.width = percentage + "%";

  var list = document.getElementById("historyList");
  list.innerHTML = "";
  if (visited.length === 0) {
    list.innerHTML =
      '<div class="history-empty">Belum ada situs yang dikunjungi. Kunjungi situs melalui kuis di halaman Situs atau ikuti Trail.</div>';
  } else {
    for (var i = 0; i < visited.length; i++) {
      var s = visited[i];
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="history-number">' +
        (i + 1) +
        "</span>" +
        '<div class="history-site-info">' +
        "<strong>" +
        s.name +
        "</strong>" +
        "<span>" +
        s.era +
        " - " +
        s.status +
        "</span>" +
        "</div>" +
        '<button class="btn-visit" style="padding: 4px 10px; font-size: 11px; background-color: var(--teal);" onclick="openSiteDetailModal(\'' +
        s.id +
        "')\">Detail</button>";
      list.appendChild(li);
    }
  }

  var visitedIds = {};
  for (var k = 0; k < visited.length; k++) {
    visitedIds[visited[k].id] = true;
  }

  document.querySelectorAll(".site-card").forEach(function (card) {
    var sid = card.getAttribute("data-site-id");
    var isVisited = visitedIds[sid] === true;

    if (isVisited) {
      card.classList.add("visited");
      card.querySelector(".btn-visit").style.display = "none";
      if (card.querySelector(".detail-btn")) {
        card.querySelector(".detail-btn").style.display = "inline-block";
      }
    } else {
      card.classList.remove("visited");
      card.querySelector(".btn-visit").style.display = "inline-block";
      if (card.querySelector(".detail-btn")) {
        card.querySelector(".detail-btn").style.display = "none";
      }
    }
  });

  updateMapMarkers(visited);

  // Perbarui marker situs di halaman Jelajah jika sudah diinisialisasi
  if (jelajahMap) renderJelajahSiteMarkers();

  var badges = data.earnedBadges || [];
  document.getElementById("badgeCount").textContent = badges.length;
  renderBadges(badges);

  // Refresh trail mode waypoints setelah data diperbarui
  if (activeTrailId) refreshTrailModeIfActive();
}

function handleNewBadges(newBadges) {
  if (newBadges && newBadges.length > 0) {
    for (var i = 0; i < newBadges.length; i++) {
      showToast(
        "Badge Diperoleh!",
        'Anda mendapatkan badge "' + newBadges[i].name + '"',
        "success",
      );
    }
  }
}

// 1. KUIS MODAL LOGIC
function openQuizModal(siteId) {
  currentQuizSiteId = siteId;
  var site = allSites.find(function (s) {
    return s.id === siteId;
  });
  if (!site || !site.quiz) {
    showToast(
      "Info",
      "Situs ini tidak memiliki kuis, langsung mengunjungi...",
      "info",
    );
    submitQuizAnswer("");
    return;
  }

  document.getElementById("quizSiteName").textContent = site.name;
  document.getElementById("quizQuestionText").textContent =
    site.quiz.questionText;
  document.getElementById("optionA").textContent = "A. " + site.quiz.optionA;
  document.getElementById("optionB").textContent = "B. " + site.quiz.optionB;
  document.getElementById("optionC").textContent = "C. " + site.quiz.optionC;
  document.getElementById("optionD").textContent = "D. " + site.quiz.optionD;

  document.getElementById("quizModalOverlay").classList.add("active");
}

function closeQuizModal() {
  document.getElementById("quizModalOverlay").classList.remove("active");
  currentQuizSiteId = null;
}

function submitQuizAnswer(answerLetter) {
  if (!currentQuizSiteId) return;

  fetch("/api/visit/" + currentQuizSiteId + "?answer=" + answerLetter, {
    method: "POST",
  })
    .then(function (r) {
      if (r.status === 401) {
        closeQuizModal();
        showAuth();
        return Promise.reject("Unauthorized");
      }
      return r.json().then((data) => ({ status: r.status, body: data }));
    })
    .then(function (res) {
      if (res.status === 200) {
        var d = res.body;
        showToast("Kunjungan Berhasil", d.message, "success");
        if (d.leveledUp) {
          showToast(
            "Naik Level!",
            "Selamat! Level Anda naik menjadi Level " + d.newLevel,
            "info",
          );
        }
        handleNewBadges(d.newBadges);
        closeQuizModal();
        loadExplorerState();
      } else {
        showToast(
          "Eror Kunjungan",
          res.body.message || "Jawaban Anda salah.",
          "error",
        );
      }
    })
    .catch(function (err) {
      if (err !== "Unauthorized") {
        showToast(
          "Eror",
          "Terjadi kesalahan komunikasi dengan server.",
          "error",
        );
      }
    });
}

// 3. REVIEWS & DETAILS MODAL
function openSiteDetailModal(siteId) {
  currentDetailSiteId = siteId;
  var site = allSites.find(function (s) {
    return s.id === siteId;
  });
  if (!site) return;

  document.getElementById("detailSiteName").textContent = site.name;
  document.getElementById("detailSiteId").textContent = site.id;
  document.getElementById("detailSiteEra").textContent = site.era;
  document.getElementById("detailSiteDesc").innerHTML = site.description;

  var detailImg = document.getElementById("detailSiteImg");
  if (detailImg) {
    if (site.imageUrl) {
      detailImg.src = site.imageUrl;
      detailImg.style.display = "block";
    } else {
      detailImg.src = "";
      detailImg.style.display = "none";
    }
  }

  loadSiteReviews(siteId);

  document.getElementById("siteDetailModalOverlay").classList.add("active");
}

function closeSiteDetailModal() {
  document.getElementById("siteDetailModalOverlay").classList.remove("active");
  currentDetailSiteId = null;
  document.getElementById("newReviewComment").value = "";
}

function loadSiteReviews(siteId) {
  var list = document.getElementById("detailReviewsList");
  list.innerHTML = '<div class="history-empty">Memuat ulasan...</div>';

  fetch("/api/sites/" + siteId + "/reviews")
    .then(function (r) {
      return r.json();
    })
    .then(function (reviews) {
      list.innerHTML = "";
      if (reviews.length === 0) {
        list.innerHTML =
          '<div class="history-empty">Belum ada ulasan untuk situs ini. Jadilah yang pertama memberikan ulasan!</div>';
        return;
      }

      for (var i = 0; i < reviews.length; i++) {
        var r = reviews[i];
        var item = document.createElement("div");
        item.className = "review-item";

        var stars = "";
        for (var s = 0; s < r.rating; s++) {
          stars += "⭐";
        }

        var dateFormatted = r.createdAt
          ? r.createdAt.substring(0, 10) + " " + r.createdAt.substring(11, 16)
          : "";
        var authorName = r.explorer ? r.explorer.username : "Anonim";

        item.innerHTML =
          '<div class="review-header">' +
          '<span class="review-author">' +
          authorName +
          "</span>" +
          '<span class="review-date">' +
          dateFormatted +
          "</span>" +
          "</div>" +
          '<div class="review-stars">' +
          stars +
          "</div>" +
          '<p class="review-comment">' +
          r.comment +
          "</p>";
        list.appendChild(item);
      }
    });
}

function submitReview() {
  if (!currentDetailSiteId) return;

  var rating = document.getElementById("newReviewRating").value;
  var comment = document.getElementById("newReviewComment").value;

  if (!comment.trim()) {
    showToast("Validasi Gagal", "Komentar ulasan tidak boleh kosong.", "error");
    return;
  }

  var url =
    "/api/sites/" +
    currentDetailSiteId +
    "/reviews?rating=" +
    rating +
    "&comment=" +
    encodeURIComponent(comment);

  fetch(url, { method: "POST" })
    .then(function (r) {
      if (r.status === 401) {
        closeSiteDetailModal();
        showAuth();
        return Promise.reject("Unauthorized");
      }
      return r.json();
    })
    .then(function () {
      showToast(
        "Ulasan Dikirim",
        "Catatan perjalanan berhasil disimpan!",
        "success",
      );
      document.getElementById("newReviewComment").value = "";
      loadSiteReviews(currentDetailSiteId);
    })
    .catch(function (err) {
      if (err !== "Unauthorized") {
        showToast("Eror", "Gagal mengirimkan ulasan.", "error");
      }
    });
}

function followTrail(trailId) {
  var trail = allTrails.find(function (t) {
    return t.id === trailId;
  });
  if (!trail) {
    showToast("Error", "Trail tidak ditemukan.", "error");
    return;
  }
  activeTrailId = trailId;
  activeTrailSiteIndex = 0;
  showPage("jelajah");
  setTimeout(function () {
    activateTrailMode(trailId);
  }, 200);
  showToast(
    "Trail Dimulai",
    "Ikuti urutan waypoint pada peta untuk menyelesaikan trail.",
    "info",
  );
}

function showTrailResultModal(data) {
  var overlay = document.getElementById("modalOverlay");
  document.getElementById("modalTitle").textContent = data.trailName;
  document.getElementById("modalSubtitle").textContent = data.message;
  var body = document.getElementById("modalBody");
  body.innerHTML = "";
  var details = data.details || [];
  for (var i = 0; i < details.length; i++) {
    var d = details[i];
    var cls = d.action === "VISITED" ? "visited" : "skipped";
    var txt = d.action === "VISITED" ? "V" : "S";
    var item = document.createElement("div");
    item.className = "trail-result-item";
    item.innerHTML =
      '<div class="result-icon ' +
      cls +
      '">' +
      txt +
      '</div><div class="result-info"><strong>' +
      d.siteName +
      "</strong><span>" +
      d.reason +
      "</span></div>";
    body.appendChild(item);
  }
  overlay.classList.add("active");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("active");
}

function resetExplorer() {
  fetch("/api/reset", { method: "POST" })
    .then(function (r) {
      if (r.status === 401) {
        showAuth();
        return Promise.reject("Unauthorized");
      }
      return r.json();
    })
    .then(function (d) {
      showToast("Reset Berhasil", d.message, "info");
      loadExplorerState();
    })
    .catch(function (err) {
      if (err !== "Unauthorized") {
        showToast("Error", "Terjadi kesalahan pada server.", "error");
      }
    });
}

function initMap(sites) {
  var mapContainer = document.getElementById("map");
  if (!mapContainer) return;

  if (map !== null) {
    map.remove();
    map = null;
    markers = {};
  }

  map = L.map("map").setView([3.5833, 98.6833], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);

  var yellowIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  for (var i = 0; i < sites.length; i++) {
    var s = sites[i];
    var marker = L.marker([s.latitude, s.longitude], {
      icon: yellowIcon,
    }).addTo(map);
    marker.bindPopup(
      "<strong>" +
        s.name +
        "</strong><br>" +
        s.era +
        "<br><em>" +
        s.status +
        "</em>",
    );
    markers[s.id] = marker;
  }
  setTimeout(function () {
    if (map) {
      map.invalidateSize();
    }
  }, 100);
}

function updateMapMarkers(visitedSites) {
  if (!map) return;
  var greenIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  var yellowIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  var visitedIds = {};
  for (var i = 0; i < visitedSites.length; i++) {
    visitedIds[visitedSites[i].id] = true;
  }
  for (var id in markers) {
    if (visitedIds[id]) {
      markers[id].setIcon(greenIcon);
    } else {
      markers[id].setIcon(yellowIcon);
    }
  }
}

function renderBadges(earnedBadges) {
  var grid = document.getElementById("badgesGrid");
  grid.innerHTML = "";

  if (allBadges.length === 0) {
    grid.innerHTML = '<div class="history-empty">Memuat daftar badge...</div>';
    return;
  }

  var earnedIds = {};
  for (var i = 0; i < earnedBadges.length; i++) {
    earnedIds[earnedBadges[i].id] = true;
  }
  for (var j = 0; j < allBadges.length; j++) {
    var b = allBadges[j];
    var isEarned = earnedIds[b.id] === true;
    var item = document.createElement("div");
    item.className = "badge-item " + (isEarned ? "earned" : "locked");
    var iconText = isEarned ? "B" + (j + 1) : "?";
    var statusText = isEarned ? "Diperoleh" : "Terkunci";
    item.innerHTML =
      '<div class="badge-icon">' +
      iconText +
      "</div>" +
      '<div class="badge-info"><strong>' +
      b.name +
      "</strong><span>" +
      b.description +
      "</span></div>" +
      '<span class="badge-status">' +
      statusText +
      "</span>";
    grid.appendChild(item);
  }
}

// ========================================
// GEOFENCING & REAL-TIME LOCATION TRACKING
// ========================================

/**
 * Formula Haversine (JavaScript):
 * Menghitung jarak dalam meter antara dua koordinat GPS.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  var R = 6371000;
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLon = ((lon2 - lon1) * Math.PI) / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Memulai pelacakan GPS real-time menggunakan browser Geolocation API */
function startLocationTracking() {
  if (!navigator.geolocation) {
    showToast(
      "GPS Tidak Tersedia",
      "Browser Anda tidak mendukung Geolocation API.",
      "error",
    );
    return;
  }
  isTracking = true;
  setTrackingUI(true);

  locationWatcher = navigator.geolocation.watchPosition(
    onLocationSuccess,
    onLocationError,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
  );
}

/** Menghentikan pelacakan GPS */
function stopLocationTracking() {
  if (locationWatcher !== null) {
    navigator.geolocation.clearWatch(locationWatcher);
    locationWatcher = null;
  }
  isTracking = false;
  setTrackingUI(false);

  // Hapus marker user dari peta
  if (userLocationMarker && map) {
    map.removeLayer(userLocationMarker);
    userLocationMarker = null;
  }
  clearGeofenceCircles();

  document.getElementById("geofenceCoordsRow").style.display = "none";
  document.getElementById("nearbySitesSection").style.display = "none";
  showToast("Pelacakan Dihentikan", "Pelacakan lokasi GPS dimatikan.", "info");
}

/** Callback sukses dari watchPosition */
function onLocationSuccess(position) {
  var lat = position.coords.latitude;
  var lon = position.coords.longitude;
  var accuracy = Math.round(position.coords.accuracy);
  var now = new Date();

  // Tampilkan koordinat
  document.getElementById("geofenceCoordsRow").style.display = "flex";
  document.getElementById("geoLat").textContent = lat.toFixed(6);
  document.getElementById("geoLon").textContent = lon.toFixed(6);
  document.getElementById("geoAccuracy").textContent = accuracy + " m";
  document.getElementById("geoLastUpdate").textContent =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0") +
    ":" +
    now.getSeconds().toString().padStart(2, "0");

  // Update marker user di peta
  updateUserMarker(lat, lon, accuracy);

  // Update daftar situs terdekat secara lokal (tanpa panggil backend)
  updateNearbyDisplay(lat, lon);

  // Sinkronisasi posisi ke halaman Jelajah
  updateJelajahPlayer(lat, lon);

  // Panggil backend untuk geofence check-in (dengan cooldown)
  var elapsed = Date.now() - lastCheckinTime;
  if (elapsed >= CHECKIN_COOLDOWN_MS) {
    lastCheckinTime = Date.now();
    checkGeofencingBackend(lat, lon);
  }
}

/** Callback error dari watchPosition */
function onLocationError(error) {
  // Hanya hentikan tracking jika izin benar-benar ditolak user.
  // Error lain (timeout, unavailable) dibiarkan — watchPosition otomatis retry.
  if (error.code === error.PERMISSION_DENIED) {
    showToast(
      "Izin Lokasi Ditolak",
      "Aktifkan izin lokasi di browser untuk menggunakan fitur ini.",
      "error",
    );
    stopLocationTracking();
  }
}

/** Update atau buat marker posisi user di peta Leaflet */
function updateUserMarker(lat, lon, accuracy) {
  if (!map) return;

  var blueIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  if (userLocationMarker) {
    userLocationMarker.setLatLng([lat, lon]);
  } else {
    userLocationMarker = L.marker([lat, lon], {
      icon: blueIcon,
      zIndexOffset: 1000,
    }).addTo(map);
    userLocationMarker.bindPopup(
      "<strong>Lokasi Anda</strong><br>Akurasi: ~" + (accuracy || "?") + " m",
    );
  }

  // Gambar lingkaran radius geofence di sekitar user
  clearGeofenceCircles();
  var circle = L.circle([lat, lon], {
    radius: GEOFENCE_RADIUS_M,
    color: "#e6b800",
    fillColor: "#e6b800",
    fillOpacity: 0.08,
    weight: 2,
    dashArray: "5,5",
  }).addTo(map);
  geofenceCircles.push(circle);

  // Pan peta ke lokasi user
  map.panTo([lat, lon]);
}

/** Hapus semua lingkaran geofence dari peta */
function clearGeofenceCircles() {
  if (!map) return;
  for (var i = 0; i < geofenceCircles.length; i++) {
    map.removeLayer(geofenceCircles[i]);
  }
  geofenceCircles = [];
}

/**
 * Hitung jarak ke semua situs dan tampilkan 5 terdekat
 * (perhitungan dilakukan di sisi client dengan Haversine JS)
 */
function updateNearbyDisplay(lat, lon) {
  if (allSites.length === 0) return;

  var withDist = allSites.map(function (s) {
    return {
      site: s,
      distance: haversineDistance(lat, lon, s.latitude, s.longitude),
    };
  });

  withDist.sort(function (a, b) {
    return a.distance - b.distance;
  });
  var top5 = withDist.slice(0, 5);

  var container = document.getElementById("nearbySitesList");
  container.innerHTML = "";
  document.getElementById("nearbySitesSection").style.display = "block";

  for (var i = 0; i < top5.length; i++) {
    var item = top5[i];
    var d = Math.round(item.distance);
    var inRange = d <= GEOFENCE_RADIUS_M;
    var visited = isVisited(item.site.id);

    var div = document.createElement("div");
    div.className = "nearby-site-item" + (inRange ? " in-range" : "");

    var statusClass = visited ? "visited" : inRange ? "in-range" : "far";
    var statusText = visited ? "Dikunjungi" : inRange ? "Dalam Radius" : "Jauh";
    var distClass = inRange ? " in-range" : "";

    div.innerHTML =
      '<div class="nearby-site-left">' +
      '<span class="nearby-site-name">' +
      item.site.name +
      "</span>" +
      '<span class="nearby-site-era">' +
      item.site.era +
      "</span>" +
      "</div>" +
      '<div class="nearby-site-right">' +
      '<span class="nearby-distance' +
      distClass +
      '">' +
      (d < 1000 ? d + " m" : (d / 1000).toFixed(2) + " km") +
      "</span>" +
      '<span class="nearby-status-badge ' +
      statusClass +
      '">' +
      statusText +
      "</span>" +
      "</div>";

    container.appendChild(div);
  }
}

/** Cek apakah situs sudah dikunjungi (dari data updateUI terakhir) */
function isVisited(siteId) {
  var cards = document.querySelectorAll(".site-card.visited");
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute("data-site-id") === siteId) return true;
  }
  return false;
}

/** Kirim koordinat ke backend untuk geofence check-in otomatis */
function checkGeofencingBackend(lat, lon) {
  var url = "/api/geofence/checkin?lat=" + lat + "&lon=" + lon;
  fetch(url, { method: "POST" })
    .then(function (r) {
      if (r.status === 401) {
        showAuth();
        return null;
      }
      return r.json();
    })
    .then(function (data) {
      if (!data || !data.success) return;

      // Tampilkan notifikasi jika ada situs yang otomatis dikunjungi
      if (data.autoVisited && data.autoVisited.length > 0) {
        var onJelajah = document
          .getElementById("page-jelajah")
          .classList.contains("active");
        for (var i = 0; i < data.autoVisited.length; i++) {
          var s = data.autoVisited[i];
          if (onJelajah) {
            showArrivalAlert(s.siteName);
          } else {
            showToast(
              "Lokasi Terdeteksi",
              'Kunjungan ke "' +
                s.siteName +
                '" otomatis tercatat (jarak: ' +
                s.distance +
                " m)",
              "success",
            );
          }
        }
        if (data.leveledUp) {
          showToast(
            "Naik Level!",
            "Selamat! Level Anda naik ke Level " + data.newLevel,
            "info",
          );
        }
        if (data.newBadges && data.newBadges.length > 0) {
          handleNewBadges(data.newBadges);
        }
        // Refresh UI
        loadExplorerState();
      }
    })
    .catch(function () {
      // Diam saja jika gagal, jangan ganggu UX
    });
}

/** Update tampilan status tracking (badge dan tombol stop) */
function setTrackingUI(active) {
  var dot = document.getElementById("statusDot");
  var text = document.getElementById("trackingStatusText");
  var btnStop = document.getElementById("btnStopTracking");

  if (active) {
    dot.classList.add("active");
    text.textContent = "Aktif";
    if (btnStop) btnStop.style.display = "inline-block";
  } else {
    dot.classList.remove("active");
    text.textContent = "Tidak Aktif";
    if (btnStop) btnStop.style.display = "none";
  }
}

// ========================================
// HALAMAN JELAJAH — POKÉMON GO STYLE
// ========================================

/** Inisialisasi peta Jelajah bertema dark CartoDB */
function initJelajahPage() {
  if (jelajahMap) {
    setTimeout(function () {
      jelajahMap.invalidateSize();
    }, 100);
    return;
  }
  var container = document.getElementById("jelajahMap");
  if (!container) return;

  jelajahMap = L.map("jelajahMap", {
    zoomControl: false,
    attributionControl: false,
  }).setView([3.5833, 98.6833], 16);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 19,
      subdomains: "abcd",
    },
  ).addTo(jelajahMap);

  L.control.zoom({ position: "bottomleft" }).addTo(jelajahMap);

  renderJelajahSiteMarkers();

  // Jika posisi user sudah tersedia, langsung tampilkan
  if (userLocationMarker) {
    var ll = userLocationMarker.getLatLng();
    updateJelajahPlayer(ll.lat, ll.lng);
  }

  // Kompas — minta izin di iOS 13+
  if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission()
        .then(function (p) {
          if (p === "granted")
            window.addEventListener(
              "deviceorientation",
              onDeviceOrientation,
              true,
            );
        })
        .catch(function () {});
    } else {
      window.addEventListener("deviceorientation", onDeviceOrientation, true);
    }
  }

  setTimeout(function () {
    jelajahMap.invalidateSize();
  }, 200);
}

/** Render ulang semua marker situs di peta Jelajah */
function renderJelajahSiteMarkers() {
  if (!jelajahMap) return;

  for (var id in jelajahSiteMarkers) {
    jelajahMap.removeLayer(jelajahSiteMarkers[id]);
  }
  jelajahSiteMarkers = {};
  lastRouteTargetId = null; // paksa refresh rute saat situs berubah

  for (var i = 0; i < allSites.length; i++) {
    var s = allSites[i];
    var cls = isVisited(s.id) ? "visited" : "unvisited";
    var icon = L.divIcon({
      className: "",
      html:
        '<div class="explore-marker-wrap">' +
        '<div class="explore-marker-avatar" style="background-image: url(\'' +
        (s.imageUrl || "") +
        "')\"></div>" +
        '<div class="explore-marker-dot ' +
        cls +
        '"></div>' +
        "</div>",
      iconSize: [40, 50],
      iconAnchor: [20, 50],
    });
    var marker = L.marker([s.latitude, s.longitude], { icon: icon }).addTo(
      jelajahMap,
    );

    var popupContent =
      '<div class="explore-popup">' +
      (s.imageUrl
        ? '<img src="' +
          s.imageUrl +
          '" class="explore-popup-img" alt="' +
          s.name +
          '">'
        : "") +
      '<div class="explore-popup-title">' +
      s.name +
      "</div>" +
      '<div class="explore-popup-era">' +
      s.era +
      "</div>" +
      '<button class="explore-popup-btn" onclick="startCustomRoute(\'' +
      s.id +
      "')\">Mulai Perjalanan</button>" +
      "</div>";

    marker.bindPopup(popupContent, {
      closeButton: false,
      offset: [0, -45],
      className: "explore-leaflet-popup",
    });

    marker.on("mouseover", function (e) {
      this.openPopup();
    });

    jelajahSiteMarkers[s.id] = marker;
  }
}

function startCustomRoute(siteId) {
  customRouteTargetId = siteId;
  lastRouteTargetId = null; // force reload route
  if (userLocationMarker) {
    var ll = userLocationMarker.getLatLng();
    updateJelajahPlayer(ll.lat, ll.lng);
  } else {
    // default/initial GPS coords fallback
    updateJelajahPlayer(3.5753, 98.6837);
  }
  showToast(
    "Rute Perjalanan Diubah",
    "Navigasi diubah menuju situs pilihan Anda.",
    "success",
  );
}

/** Perbarui posisi player, pan otomatis, update HUD dan efek situs */
function updateJelajahPlayer(lat, lon) {
  if (!jelajahMap) return;

  var icon = L.divIcon({
    className: "",
    html: '<div class="player-marker-outer"><div class="player-pulse"></div><div class="player-inner"></div></div>',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

  if (jelajahPlayerMarker) {
    jelajahPlayerMarker.setLatLng([lat, lon]);
  } else {
    jelajahPlayerMarker = L.marker([lat, lon], {
      icon: icon,
      zIndexOffset: 1000,
    }).addTo(jelajahMap);
  }

  // Ikuti player secara smooth
  jelajahMap.panTo([lat, lon], { animate: true, duration: 0.6 });

  updateJelajahHUD(lat, lon);
  updateJelajahRoute(lat, lon);
  updateJelajahSiteGlows(lat, lon);

  // Check for EXP points collection along the route
  for (var i = 0; i < routeExpPoints.length; i++) {
    var ep = routeExpPoints[i];
    if (!ep.collected) {
      var distToPlayer = haversineDistance(lat, lon, ep.lat, ep.lon);
      if (distToPlayer <= 25) {
        // 25 meter radius koleksi
        collectExpPoint(ep);
      }
    }
  }

  var el = document.getElementById("hudCoords");
  if (el) el.textContent = lat.toFixed(5) + "\n" + lon.toFixed(5);
}

/** Update HUD: nama & jarak situs tujuan terdekat yang belum dikunjungi */
function updateJelajahHUD(lat, lon) {
  var nameEl = document.getElementById("hudSiteName");
  var distEl = document.getElementById("hudDistance");
  if (!nameEl || !distEl) return;

  var targetSite = null;
  if (customRouteTargetId) {
    if (isVisited(customRouteTargetId)) {
      customRouteTargetId = null;
    } else {
      targetSite = allSites.find(function (s) {
        return s.id === customRouteTargetId;
      });
    }
  }

  if (!targetSite) {
    var unvisited = allSites.filter(function (s) {
      return !isVisited(s.id);
    });
    if (unvisited.length === 0) {
      nameEl.textContent = "Semua situs dikunjungi!";
      distEl.textContent = "";
      return;
    }

    var nearest = unvisited.reduce(
      function (best, s) {
        var d = haversineDistance(lat, lon, s.latitude, s.longitude);
        return d < best.dist ? { site: s, dist: d } : best;
      },
      { site: unvisited[0], dist: Infinity },
    );
    targetSite = nearest.site;
  }

  nameEl.textContent = targetSite.name;
  var d = haversineDistance(
    lat,
    lon,
    targetSite.latitude,
    targetSite.longitude,
  );
  var distRounded = Math.round(d);
  distEl.textContent =
    distRounded < 1000
      ? distRounded + " m"
      : (distRounded / 1000).toFixed(2) + " km";
}

/**
 * Rute jalan nyata ke situs terdekat menggunakan OSRM (Open Source Routing Machine).
 * Tampilkan straight-line dahulu sebagai placeholder, lalu ganti dengan rute jalan.
 */
function updateJelajahRoute(userLat, userLon) {
  if (!jelajahMap) return;

  var targetSite = null;
  if (customRouteTargetId) {
    if (isVisited(customRouteTargetId)) {
      customRouteTargetId = null;
    } else {
      targetSite = allSites.find(function (s) {
        return s.id === customRouteTargetId;
      });
    }
  }

  if (!targetSite) {
    var unvisited = allSites.filter(function (s) {
      return !isVisited(s.id);
    });
    if (unvisited.length === 0) {
      clearJelajahRoute();
      return;
    }

    var nearest = unvisited.reduce(
      function (best, s) {
        var d = haversineDistance(userLat, userLon, s.latitude, s.longitude);
        return d < best.dist ? { site: s, dist: d } : best;
      },
      { site: unvisited[0], dist: Infinity },
    );
    targetSite = nearest.site;
  }

  // Jika target belum berubah, tidak perlu fetch ulang
  if (lastRouteTargetId === targetSite.id) return;
  lastRouteTargetId = targetSite.id;

  // Tampilkan placeholder straight-line langsung
  drawStraightRoute(
    userLat,
    userLon,
    targetSite.latitude,
    targetSite.longitude,
  );

  // Debounce fetch rute jalan dari OSRM
  if (routeFetchTimer) clearTimeout(routeFetchTimer);
  routeFetchTimer = setTimeout(function () {
    fetchAndDrawRoute(
      userLat,
      userLon,
      targetSite.latitude,
      targetSite.longitude,
    );
  }, 600);
}

/** Panggil OSRM public API untuk mendapatkan rute jalan kaki */
function fetchAndDrawRoute(lat1, lon1, lat2, lon2) {
  // OSRM menggunakan urutan lon,lat
  var url =
    "https://router.project-osrm.org/route/v1/foot/" +
    lon1 +
    "," +
    lat1 +
    ";" +
    lon2 +
    "," +
    lat2 +
    "?overview=full&geometries=geojson";

  fetch(url)
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      if (!data.routes || !data.routes[0]) {
        drawStraightRoute(lat1, lon1, lat2, lon2);
        return;
      }
      drawRouteFromGeoJSON(data.routes[0].geometry.coordinates);
    })
    .catch(function () {
      drawStraightRoute(lat1, lon1, lat2, lon2);
    });
}

/** Render rute jalan sebenarnya dari koordinat GeoJSON OSRM */
function drawRouteFromGeoJSON(coords) {
  if (!jelajahMap) return;
  clearJelajahRoute();

  // OSRM mengembalikan [lon, lat], Leaflet membutuhkan [lat, lon]
  var latlngs = coords.map(function (c) {
    return [c[1], c[0]];
  });

  // Dua layer: border bawah + fill atas (gaya Google Maps)
  var border = L.polyline(latlngs, {
    color: "#0d2b4e",
    weight: 9,
    opacity: 0.6,
    lineCap: "round",
    lineJoin: "round",
  });
  var fill = L.polyline(latlngs, {
    color: "#4a9eff",
    weight: 5,
    opacity: 0.92,
    lineCap: "round",
    lineJoin: "round",
  });

  jelajahRouteLayer = L.layerGroup([border, fill]).addTo(jelajahMap);
  generateRouteExpPoints(latlngs);
}

/** Fallback: garis lurus sementara OSRM belum merespons */
function drawStraightRoute(lat1, lon1, lat2, lon2) {
  if (!jelajahMap) return;
  clearJelajahRoute();
  jelajahRouteLayer = L.polyline(
    [
      [lat1, lon1],
      [lat2, lon2],
    ],
    {
      color: "#4a9eff",
      weight: 3,
      opacity: 0.6,
      dashArray: "10, 7",
      lineCap: "round",
    },
  ).addTo(jelajahMap);
  generateRouteExpPoints([
    [lat1, lon1],
    [lat2, lon2],
  ]);
}

/** Hapus layer rute dari peta */
function clearJelajahRoute() {
  if (jelajahRouteLayer && jelajahMap) {
    jelajahMap.removeLayer(jelajahRouteLayer);
    jelajahRouteLayer = null;
  }
  clearRouteExpMarkers();
}

function generateRouteExpPoints(latlngs) {
  clearRouteExpMarkers();
  routeExpPoints = [];

  if (latlngs.length < 2) return;

  var currentDist = 0;
  var count = 0;

  if (latlngs.length === 2) {
    var p1 = latlngs[0];
    var p2 = latlngs[1];
    var totalD = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
    var numPoints = Math.floor(totalD / 120);

    for (var k = 1; k <= numPoints; k++) {
      var ratio = k / (numPoints + 1);
      var interpLat = p1[0] + (p2[0] - p1[0]) * ratio;
      var interpLon = p1[1] + (p2[1] - p1[1]) * ratio;

      var epId = "exp_straight_" + k;
      var ep = {
        id: epId,
        lat: interpLat,
        lon: interpLon,
        xpValue: 15,
        collected: false,
      };
      routeExpPoints.push(ep);

      var icon = L.divIcon({
        className: "",
        html: '<div class="exp-point-marker">★</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      var marker = L.marker([ep.lat, ep.lon], { icon: icon }).addTo(jelajahMap);
      marker.bindTooltip("+15 XP", {
        permanent: false,
        direction: "top",
        className: "jelajah-tt",
        offset: [0, -10],
      });

      routeExpMarkers[epId] = marker;
    }
    return;
  }

  for (var i = 1; i < latlngs.length - 1; i++) {
    var p1 = latlngs[i - 1];
    var p2 = latlngs[i];
    var segDist = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
    currentDist += segDist;

    // Bagikan bintang EXP setiap 120 meter
    if (currentDist >= 120) {
      var epId = "exp_" + lastRouteTargetId + "_" + i;
      var ep = {
        id: epId,
        lat: p2[0],
        lon: p2[1],
        xpValue: 15, // 15 XP per titik bintang
        collected: false,
      };
      routeExpPoints.push(ep);

      // Gambar marker di peta
      var icon = L.divIcon({
        className: "",
        html: '<div class="exp-point-marker">★</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      var marker = L.marker([ep.lat, ep.lon], { icon: icon }).addTo(jelajahMap);

      marker.bindTooltip("+15 XP", {
        permanent: false,
        direction: "top",
        className: "jelajah-tt",
        offset: [0, -10],
      });

      routeExpMarkers[epId] = marker;
      currentDist = 0; // reset akumulasi jarak
      count++;
    }
  }
}

function clearRouteExpMarkers() {
  for (var id in routeExpMarkers) {
    if (jelajahMap && routeExpMarkers[id]) {
      jelajahMap.removeLayer(routeExpMarkers[id]);
    }
  }
  routeExpMarkers = {};
  routeExpPoints = [];
}

function collectExpPoint(ep) {
  ep.collected = true;

  if (jelajahMap && routeExpMarkers[ep.id]) {
    jelajahMap.removeLayer(routeExpMarkers[ep.id]);
    delete routeExpMarkers[ep.id];
  }

  fetch("/api/explorer/add-xp?amount=" + ep.xpValue, { method: "POST" })
    .then(function (r) {
      if (r.status === 401) {
        showAuth();
        return null;
      }
      return r.json();
    })
    .then(function (res) {
      if (res && res.success) {
        showToast(
          "Koleksi XP",
          "Mendapatkan +" + ep.xpValue + " XP dari perjalanan!",
          "success",
        );
        if (res.leveledUp) {
          showToast(
            "Naik Level!",
            "Selamat! Level Anda naik menjadi Level " + res.newLevel,
            "info",
          );
        }
        loadExplorerState(); // Update tampilan Riwayat (XP progress bar & level)
      }
    })
    .catch(function () {});
}

/** Update efek glow marker situs berdasarkan jarak ke user */
function updateJelajahSiteGlows(lat, lon) {
  for (var id in jelajahSiteMarkers) {
    var site = allSites.find(function (s) {
      return s.id === id;
    });
    if (!site) continue;
    var d = haversineDistance(lat, lon, site.latitude, site.longitude);
    var cls = isVisited(id)
      ? "visited"
      : d <= GEOFENCE_RADIUS_M
        ? "in-range"
        : "unvisited";
    jelajahSiteMarkers[id].setIcon(
      L.divIcon({
        className: "",
        html:
          '<div class="explore-marker-wrap">' +
          '<div class="explore-marker-avatar" style="background-image: url(\'' +
          (site.imageUrl || "") +
          "')\"></div>" +
          '<div class="explore-marker-dot ' +
          cls +
          '"></div>' +
          "</div>",
        iconSize: [40, 50],
        iconAnchor: [20, 50],
      }),
    );
  }
}

/** Alert kedatangan gaya Pokémon GO encounter */
function showArrivalAlert(siteName) {
  var el = document.getElementById("jelajahArrivalAlert");
  var nameEl = document.getElementById("arrivalSiteName");
  if (!el || !nameEl) return;
  nameEl.textContent = siteName;
  el.style.display = "flex";
  // Re-trigger CSS animation
  el.style.animation = "none";
  el.offsetHeight; // reflow
  el.style.animation = "";
  if (arrivalAlertTimer) clearTimeout(arrivalAlertTimer);
  arrivalAlertTimer = setTimeout(function () {
    el.style.display = "none";
  }, 4500);
}

// ---- Kompas ----
function onDeviceOrientation(e) {
  var h =
    e.webkitCompassHeading !== undefined ? e.webkitCompassHeading : e.alpha;
  if (h === null || h === undefined) return;
  deviceHeading = h;
  var needle = document.getElementById("compassNeedle");
  if (needle) needle.style.transform = "translateX(-50%) rotate(" + -h + "deg)";
}

// ---- Mode AR ----
function toggleARMode() {
  isARMode = !isARMode;
  var arView = document.getElementById("arView");
  var btn = document.getElementById("btnARToggle");
  if (isARMode) {
    arView.style.display = "block";
    if (btn) {
      btn.classList.add("active");
      btn.textContent = "Map Mode";
    }
    startARMode();
  } else {
    arView.style.display = "none";
    if (btn) {
      btn.classList.remove("active");
      btn.textContent = "AR Mode";
    }
    stopARMode();
  }
}

function startARMode() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast(
      "AR Tidak Tersedia",
      "Kamera tidak didukung browser ini.",
      "error",
    );
    isARMode = false;
    document.getElementById("arView").style.display = "none";
    return;
  }
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then(function (stream) {
      arStream = stream;
      var video = document.getElementById("arCamera");
      video.srcObject = stream;
      video.play();
      runARCanvas();
    })
    .catch(function () {
      showToast(
        "Kamera Ditolak",
        "Aktifkan izin kamera untuk mode AR.",
        "error",
      );
      isARMode = false;
      document.getElementById("arView").style.display = "none";
      var btn = document.getElementById("btnARToggle");
      if (btn) {
        btn.classList.remove("active");
        btn.textContent = "AR Mode";
      }
    });
}

function stopARMode() {
  if (arStream) {
    arStream.getTracks().forEach(function (t) {
      t.stop();
    });
    arStream = null;
  }
  if (arRafId) {
    cancelAnimationFrame(arRafId);
    arRafId = null;
  }
}

/** Loop canvas AR — gambar beacon situs berdasarkan arah kompas */
function runARCanvas() {
  var canvas = document.getElementById("arCanvas");
  var ctx = canvas.getContext("2d");
  var HFOV = 60;

  function frame() {
    if (!isARMode) return;
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var userLL = userLocationMarker ? userLocationMarker.getLatLng() : null;
    if (!userLL) {
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.textAlign = "center";
      ctx.fillText(
        "Menunggu sinyal GPS...",
        canvas.width / 2,
        canvas.height / 2,
      );
      arRafId = requestAnimationFrame(frame);
      return;
    }

    var uLat = userLL.lat,
      uLon = userLL.lng,
      cx = canvas.width / 2;

    for (var i = 0; i < allSites.length; i++) {
      var s = allSites[i];
      var dist = haversineDistance(uLat, uLon, s.latitude, s.longitude);
      var bear = calcBearing(uLat, uLon, s.latitude, s.longitude);
      var rel = bear - deviceHeading;
      while (rel > 180) rel -= 360;
      while (rel < -180) rel += 360;
      if (Math.abs(rel) > HFOV / 2 + 5) continue;

      var sx = cx + (rel / (HFOV / 2)) * cx;
      var sy = canvas.height * 0.32;
      var r = dist <= GEOFENCE_RADIUS_M ? 28 : 18;
      var visited = isVisited(s.id);
      var inRange = dist <= GEOFENCE_RADIUS_M;

      // Aura glow saat in-range
      if (inRange && !visited) {
        ctx.beginPath();
        ctx.arc(sx, sy, r + 14, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(230,184,0,0.14)";
        ctx.fill();
      }

      // Beacon lingkaran
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = visited
        ? "rgba(46,125,50,0.88)"
        : inRange
          ? "rgba(230,184,0,0.92)"
          : "rgba(255,255,255,0.72)";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Batang bawah
      ctx.beginPath();
      ctx.moveTo(sx, sy + r);
      ctx.lineTo(sx, sy + r + 18);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 5;
      ctx.textAlign = "center";

      ctx.font = "bold 13px Inter, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(s.name, sx, sy + r + 35);

      var dLabel =
        dist < 1000
          ? Math.round(dist) + " m"
          : (dist / 1000).toFixed(1) + " km";
      ctx.font = "bold 12px Courier New";
      ctx.fillStyle = inRange ? "#e6b800" : "rgba(255,255,255,0.7)";
      ctx.fillText(dLabel, sx, sy + r + 51);

      ctx.restore();
    }

    // Crosshair
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 14, canvas.height / 2);
    ctx.lineTo(cx + 14, canvas.height / 2);
    ctx.moveTo(cx, canvas.height / 2 - 14);
    ctx.lineTo(cx, canvas.height / 2 + 14);
    ctx.stroke();

    arRafId = requestAnimationFrame(frame);
  }
  frame();
}

/** Hitung bearing (0–360°) dari titik 1 ke titik 2 */
function calcBearing(lat1, lon1, lat2, lon2) {
  var dLon = ((lon2 - lon1) * Math.PI) / 180;
  var la1 = (lat1 * Math.PI) / 180;
  var la2 = (lat2 * Math.PI) / 180;
  var y = Math.sin(dLon) * Math.cos(la2);
  var x =
    Math.cos(la1) * Math.sin(la2) -
    Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ========================================
// TRAIL MODE — Urutan Waypoint di Jelajah
// ========================================

/**
 * Aktifkan trail mode: tampilkan panel waypoint dan navigasi ke situs pertama
 */
function activateTrailMode(trailId) {
  var trail = allTrails.find(function (t) {
    return t.id === trailId;
  });
  if (!trail || !trail.route || trail.route.length === 0) return;

  activeTrailId = trailId;
  // Mulai dari situs pertama yang belum dikunjungi
  activeTrailSiteIndex = 0;
  for (var i = 0; i < trail.route.length; i++) {
    if (!isVisited(trail.route[i].id)) {
      activeTrailSiteIndex = i;
      break;
    }
    // Jika semua dikunjungi, set ke terakhir
    if (i === trail.route.length - 1) {
      activeTrailSiteIndex = trail.route.length - 1;
    }
  }

  renderTrailModePanel(trail);
  // Arahkan navigasi ke waypoint aktif
  var targetSite = trail.route[activeTrailSiteIndex];
  if (targetSite) {
    customRouteTargetId = targetSite.id;
    lastRouteTargetId = null;
    if (userLocationMarker) {
      var ll = userLocationMarker.getLatLng();
      updateJelajahPlayer(ll.lat, ll.lng);
    }
  }
}

/**
 * Render panel trail mode dengan daftar waypoint bernomor
 */
function renderTrailModePanel(trail) {
  var panel = document.getElementById("trailModePanel");
  var titleEl = document.getElementById("trailModeName");
  var waypointsEl = document.getElementById("trailModeWaypoints");
  if (!panel || !titleEl || !waypointsEl) return;

  titleEl.textContent = trail.name;
  waypointsEl.innerHTML = "";

  for (var i = 0; i < trail.route.length; i++) {
    var site = trail.route[i];
    var visited = isVisited(site.id);
    var isCurrent = i === activeTrailSiteIndex;

    var item = document.createElement("div");
    item.className =
      "trail-waypoint-item" +
      (visited ? " wp-visited" : "") +
      (isCurrent && !visited ? " wp-current" : "");

    var letter = String.fromCharCode(65 + i); // A, B, C, ...
    item.innerHTML =
      '<div class="wp-badge' +
      (visited ? " wp-badge-done" : isCurrent ? " wp-badge-active" : "") +
      '">' +
      (visited ? "✓" : letter) +
      "</div>" +
      '<div class="wp-info">' +
      '<span class="wp-name">' +
      site.name +
      "</span>" +
      '<span class="wp-status">' +
      (visited ? "Selesai" : isCurrent ? "Tujuan Sekarang" : "Menunggu") +
      "</span>" +
      "</div>" +
      (isCurrent && !visited
        ? '<button class="wp-nav-btn" onclick="navigateToWaypoint(\'' +
          site.id +
          "')\">Navigasi</button>"
        : "");

    // Tambah konektor vertikal antar waypoint (kecuali terakhir)
    if (i < trail.route.length - 1) {
      var connector = document.createElement("div");
      connector.className =
        "wp-connector" + (visited ? " wp-connector-done" : "");
      waypointsEl.appendChild(item);
      waypointsEl.appendChild(connector);
    } else {
      waypointsEl.appendChild(item);
    }
  }

  panel.style.display = "flex";
}

/**
 * Navigasi ke waypoint tertentu (panggil dari tombol "Navigasi" di panel)
 */
function navigateToWaypoint(siteId) {
  customRouteTargetId = siteId;
  lastRouteTargetId = null;
  if (userLocationMarker) {
    var ll = userLocationMarker.getLatLng();
    updateJelajahPlayer(ll.lat, ll.lng);
  } else {
    updateJelajahPlayer(3.5833, 98.6833);
  }
  showToast(
    "Navigasi Diperbarui",
    "Navigasi menuju waypoint berikutnya.",
    "info",
  );
}

/**
 * Tutup trail mode
 */
function closeTrailMode() {
  activeTrailId = null;
  activeTrailSiteIndex = 0;
  customRouteTargetId = null;
  lastRouteTargetId = null;
  clearJelajahRoute();
  var panel = document.getElementById("trailModePanel");
  if (panel) panel.style.display = "none";
}

/**
 * Refresh panel trail mode setelah kunjungan situs (dipanggil dari updateUI)
 * Panggil ini setelah UI diupdate agar badge visited terupdate
 */
function refreshTrailModeIfActive() {
  if (!activeTrailId) return;
  var trail = allTrails.find(function (t) {
    return t.id === activeTrailId;
  });
  if (!trail) return;

  // Cek apakah semua situs dikunjungi → trail selesai
  var allVisited = trail.route.every(function (s) {
    return isVisited(s.id);
  });
  if (allVisited) {
    showToast(
      "Trail Selesai! 🎉",
      "Selamat! Kamu telah menyelesaikan trail " + trail.name + ".",
      "success",
    );
    // Lakukan followTrail backend untuk award badge
    fetch("/api/trail/" + activeTrailId, { method: "POST" })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        handleNewBadges(d.newBadges);
        loadExplorerState();
      })
      .catch(function () {});
    closeTrailMode();
    return;
  }

  // Update index ke situs berikutnya yang belum dikunjungi
  for (var i = 0; i < trail.route.length; i++) {
    if (!isVisited(trail.route[i].id)) {
      activeTrailSiteIndex = i;
      break;
    }
  }
  renderTrailModePanel(trail);

  // Update target navigasi ke waypoint baru
  var nextSite = trail.route[activeTrailSiteIndex];
  if (nextSite && customRouteTargetId !== nextSite.id) {
    customRouteTargetId = nextSite.id;
    lastRouteTargetId = null;
    if (userLocationMarker) {
      var ll = userLocationMarker.getLatLng();
      updateJelajahPlayer(ll.lat, ll.lng);
    }
  }
}
