package com.medanheritage.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medanheritage.model.*;
import com.medanheritage.repository.*;
import com.medanheritage.util.HaversineUtil;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class HeritageService {

    public static final double GEOFENCE_RADIUS_METERS = 100.0;

    private final SiteRepository siteRepository;
    private final ExplorerRepository explorerRepository;
    private final ReviewRepository reviewRepository;
    private final BadgeRepository badgeRepository;
    private final TrailRepository trailRepository;
    private final PasswordEncoder passwordEncoder;

    public HeritageService(
        SiteRepository siteRepository,
        ExplorerRepository explorerRepository,
        ReviewRepository reviewRepository,
        BadgeRepository badgeRepository,
        TrailRepository trailRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.siteRepository = siteRepository;
        this.explorerRepository = explorerRepository;
        this.reviewRepository = reviewRepository;
        this.badgeRepository = badgeRepository;
        this.trailRepository = trailRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    public void init() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            InputStream inputStream = getClass()
                .getClassLoader()
                .getResourceAsStream("data.json");
            if (inputStream != null) {
                SeedData seed = mapper.readValue(inputStream, SeedData.class);

                if (siteRepository.count() == 0 && seed.sites != null) {
                    siteRepository.saveAll(seed.sites);
                }

                // Upsert Badges by ID (seed yang belum ada)
                if (seed.badges != null) {
                    for (com.medanheritage.model.Badge b : seed.badges) {
                        if (!badgeRepository.existsById(b.getId())) {
                            badgeRepository.save(b);
                        }
                    }
                }

                // Upsert Trails by ID (seed yang belum ada)
                if (seed.trails != null) {
                    for (TrailSeed ts : seed.trails) {
                        if (!trailRepository.existsById(ts.id)) {
                            List<HeritageSite> route = new ArrayList<>();
                            if (ts.routeSiteIds != null) {
                                for (String siteId : ts.routeSiteIds) {
                                    siteRepository
                                        .findById(siteId)
                                        .ifPresent(route::add);
                                }
                            }
                            trailRepository.save(new Trail(ts.id, ts.name, route));
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        Optional<Explorer> existingAdmin = explorerRepository.findByUsername("admin@jejakdeli");
        if (existingAdmin.isPresent()) {
            Explorer admin = existingAdmin.get();
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            explorerRepository.save(admin);
        } else {
            Explorer admin = new Explorer("admin@jejakdeli", "admin@jejakdeli.com",
                passwordEncoder.encode("admin123"), "ADMIN");
            explorerRepository.save(admin);
        }

    }

    private static class SeedData {

        public List<HeritageSite> sites;
        public List<Badge> badges;
        public List<TrailSeed> trails;
    }

    private static class TrailSeed {

        public String id;
        public String name;
        public List<String> routeSiteIds;
    }

    public List<HeritageSite> getAllSites() {
        return siteRepository.findAll();
    }

    public List<HeritageSite> getSites(String search, String category) {
        String searchParam = (search != null) ? search.trim() : "";
        String statusParam = (category != null) ? category.trim() : "";
        return siteRepository.searchSites(searchParam, statusParam);
    }

    public HeritageSite getSiteById(String id) {
        return siteRepository.findById(id).orElse(null);
    }

    public List<Trail> getAllTrails() {
        return trailRepository.findAll();
    }

    public Trail getTrailById(String id) {
        return trailRepository.findById(id).orElse(null);
    }

    public List<Badge> getAllBadges() {
        return badgeRepository.findAll();
    }

    public Explorer getExplorerById(Long id) {
        return explorerRepository.findById(id).orElse(null);
    }

    public Map<String, Object> addXp(Long explorerId, int amount) {
        Map<String, Object> result = new LinkedHashMap<>();
        Explorer explorer = getExplorerById(explorerId);
        if (explorer != null) {
            boolean leveledUp = explorer.addXp(amount);
            explorerRepository.save(explorer);
            result.put("success", true);
            result.put("newXp", explorer.getXp());
            result.put("newLevel", explorer.getLevel());
            result.put("leveledUp", leveledUp);
            result.put("message", "Mendapatkan +" + amount + " XP!");
        } else {
            result.put("success", false);
            result.put("message", "Explorer tidak ditemukan.");
        }
        return result;
    }

    // Authentication Services
    public Map<String, Object> registerUser(String username, String password) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (
            username == null ||
            username.trim().isEmpty() ||
            password == null ||
            password.trim().isEmpty()
        ) {
            result.put("success", false);
            result.put("message", "Username dan password tidak boleh kosong.");
            return result;
        }
        if (explorerRepository.findByUsername(username.trim()).isPresent()) {
            result.put("success", false);
            result.put(
                "message",
                "Username '" + username + "' sudah terdaftar."
            );
            return result;
        }
        Explorer explorer = new Explorer(
            username.trim(),
            passwordEncoder.encode(password.trim())
        );
        explorerRepository.save(explorer);
        result.put("success", true);
        result.put("message", "Registrasi berhasil! Silakan login.");
        return result;
    }

    public Explorer authenticateUser(String username, String password) {
        if (username == null || password == null) return null;
        String term = username.trim();
        Optional<Explorer> opt = explorerRepository.findByUsernameOrEmail(term, term);
        if (opt.isPresent()) {
            Explorer exp = opt.get();
            if (passwordEncoder.matches(password.trim(), exp.getPassword())) {
                return exp;
            }
        }
        return null;
    }

    public Map<String, Object> visitSite(
        String siteId,
        String selectedAnswer,
        Long explorerId
    ) {
        Map<String, Object> result = new LinkedHashMap<>();
        HeritageSite site = siteRepository.findById(siteId).orElse(null);

        if (site == null) {
            result.put("success", false);
            result.put(
                "message",
                "Situs dengan ID '" + siteId + "' tidak ditemukan."
            );
            return result;
        }

        Explorer explorer = getExplorerById(explorerId);
        if (explorer == null) {
            result.put("success", false);
            result.put("message", "Pengguna tidak aktif. Silakan login.");
            return result;
        }

        if (explorer.hasVisited(siteId)) {
            result.put("success", false);
            result.put(
                "message",
                "Anda sudah pernah mengunjungi " + site.getName() + "."
            );
            return result;
        }

        // Verify quiz answer
        if (site.getQuiz() != null) {
            String correctOption = site.getQuiz().getCorrectOption();
            if (
                selectedAnswer == null ||
                !correctOption.equalsIgnoreCase(selectedAnswer.trim())
            ) {
                result.put("success", false);
                result.put(
                    "message",
                    "Jawaban kuis salah! Coba pelajari sejarah situs kembali."
                );
                return result;
            }
        }

        explorer.visit(site);
        explorer.recordVisit(site, java.time.LocalDateTime.now());
        boolean leveledUp = explorer.addXp(100);
        explorerRepository.save(explorer);

        List<Badge> newBadges = checkAndAwardBadges(explorer);
        explorerRepository.save(explorer);

        result.put("success", true);
        result.put(
            "message",
            "Jawaban Benar! Berhasil mengunjungi " + site.getName() + "."
        );
        result.put("site", site);
        result.put("newBadges", newBadges);
        result.put("leveledUp", leveledUp);
        result.put("xpGained", 100);
        result.put("newLevel", explorer.getLevel());
        result.put("newXp", explorer.getXp());
        return result;
    }



    public Map<String, Object> followTrail(String trailId, Long explorerId) {
        Map<String, Object> result = new LinkedHashMap<>();
        Trail trail = trailRepository.findById(trailId).orElse(null);

        if (trail == null) {
            result.put("success", false);
            result.put(
                "message",
                "Trail dengan ID '" + trailId + "' tidak ditemukan."
            );
            return result;
        }

        Explorer explorer = getExplorerById(explorerId);
        if (explorer == null) {
            result.put("success", false);
            result.put("message", "Pengguna tidak aktif. Silakan login.");
            return result;
        }

        List<Map<String, Object>> details = new ArrayList<>();
        int visited = 0;
        int skipped = 0;
        int xpGained = 0;

        for (HeritageSite site : trail.getRoute()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("siteId", site.getId());
            entry.put("siteName", site.getName());

            if (explorer.hasVisited(site.getId())) {
                entry.put("action", "SKIPPED");
                entry.put("reason", "Sudah pernah dikunjungi");
                skipped++;
            } else {
                explorer.visit(site);
                explorer.recordVisit(site, java.time.LocalDateTime.now());
                explorer.addXp(100);
                xpGained += 100;
                entry.put("action", "VISITED");
                entry.put("reason", "Berhasil dikunjungi via Trail");
                visited++;
            }
            details.add(entry);
        }

        boolean leveledUp = false;
        if (visited > 0) {
            leveledUp = explorer.addXp(150);
            xpGained += 150;
        }
        explorerRepository.save(explorer);

        List<Badge> newBadges = checkAndAwardBadges(explorer);
        explorerRepository.save(explorer);

        result.put("success", true);
        result.put("trailName", trail.getName());
        result.put(
            "message",
            "Trail '" +
                trail.getName() +
                "' selesai diproses. " +
                visited +
                " situs dikunjungi, " +
                skipped +
                " situs dilewati. Bonus +" +
                xpGained +
                " XP."
        );
        result.put("details", details);
        result.put("newBadges", newBadges);
        result.put("leveledUp", leveledUp);
        result.put("xpGained", xpGained);
        result.put("newLevel", explorer.getLevel());
        result.put("newXp", explorer.getXp());
        return result;
    }

    private List<Badge> checkAndAwardBadges(Explorer explorer) {
        List<Badge> newlyEarned = new ArrayList<>();
        List<Badge> allBadges = badgeRepository.findAll();
        for (Badge badge : allBadges) {
            if (explorer.hasBadge(badge.getId())) {
                continue;
            }

            String conditionType = badge.getConditionType();
            // Default to TRAIL for backward compatibility
            if (conditionType == null || conditionType.isEmpty()) {
                conditionType = "TRAIL";
            }

            boolean earned = false;

            if ("TRAIL".equals(conditionType)) {
                // Original logic: check all sites in the trail are visited
                if (badge.getTrailId() != null && !badge.getTrailId().isEmpty()) {
                    Trail trail = trailRepository
                        .findById(badge.getTrailId())
                        .orElse(null);
                    if (trail != null) {
                        boolean allVisited = true;
                        for (HeritageSite site : trail.getRoute()) {
                            if (!explorer.hasVisited(site.getId())) {
                                allVisited = false;
                                break;
                            }
                        }
                        earned = allVisited;
                    }
                }
            } else if ("CATEGORY".equals(conditionType)) {
                // Check all sites with matching status/category are visited
                String category = badge.getCategoryName();
                if (category != null && !category.isEmpty()) {
                    List<HeritageSite> categorySites = siteRepository.findAll();
                    boolean allCategoryVisited = true;
                    boolean hasSites = false;
                    for (HeritageSite site : categorySites) {
                        if (category.equalsIgnoreCase(site.getStatus())) {
                            hasSites = true;
                            if (!explorer.hasVisited(site.getId())) {
                                allCategoryVisited = false;
                                break;
                            }
                        }
                    }
                    earned = hasSites && allCategoryVisited;
                }
            } else if ("CUSTOM".equals(conditionType)) {
                // Check if explorer has visited >= requiredVisits sites
                Integer requiredVisits = badge.getRequiredVisits();
                if (requiredVisits != null && requiredVisits > 0) {
                    Integer timeVal = badge.getTimePeriodValue();
                    String timeUnit = badge.getTimePeriodUnit();
                    
                    if (timeVal != null && timeVal > 0 && timeUnit != null && !timeUnit.isEmpty()) {
                        List<SiteVisit> visits = new ArrayList<>(explorer.getSiteVisits());
                        visits.sort(Comparator.comparing(SiteVisit::getVisitTime));
                        
                        boolean windowMatched = false;
                        for (int i = 0; i < visits.size(); i++) {
                            java.time.LocalDateTime start = visits.get(i).getVisitTime();
                            java.time.LocalDateTime end = start;
                            if ("JAM".equalsIgnoreCase(timeUnit)) {
                                end = start.plusHours(timeVal);
                            } else if ("HARI".equalsIgnoreCase(timeUnit)) {
                                end = start.plusDays(timeVal);
                            } else if ("BULAN".equalsIgnoreCase(timeUnit)) {
                                end = start.plusMonths(timeVal);
                            }
                            
                            Set<String> visitedInWindow = new java.util.HashSet<>();
                            for (int j = i; j < visits.size(); j++) {
                                SiteVisit v = visits.get(j);
                                if (!v.getVisitTime().isAfter(end)) {
                                    visitedInWindow.add(v.getSite().getId());
                                } else {
                                    break;
                                }
                            }
                            
                            if (visitedInWindow.size() >= requiredVisits) {
                                windowMatched = true;
                                break;
                            }
                        }
                        earned = windowMatched;
                    } else {
                        int visitedCount = explorer.getVisitedSites() != null
                            ? explorer.getVisitedSites().size() : 0;
                        earned = visitedCount >= requiredVisits;
                    }
                }
            }

            if (earned) {
                explorer.addBadge(badge);
                newlyEarned.add(badge);
            }
        }
        return newlyEarned;
    }

    // Reviews methods
    public List<Review> getReviewsBySite(String siteId) {
        return reviewRepository.findBySiteIdOrderByCreatedAtDesc(siteId);
    }

    public Review addReview(
        String siteId,
        int rating,
        String comment,
        Long explorerId
    ) {
        Explorer explorer = getExplorerById(explorerId);
        if (explorer == null) return null;
        Review review = new Review(
            siteId,
            explorer,
            rating,
            comment,
            java.time.LocalDateTime.now()
        );
        return reviewRepository.save(review);
    }

    /**
     * Geofence check-in: menghitung jarak pengguna ke semua situs menggunakan
     * Formula Haversine. Situs yang berada dalam radius GEOFENCE_RADIUS_METERS
     * dan belum dikunjungi akan otomatis dicatat sebagai kunjungan.
     *
     * @param lat        Latitude pengguna saat ini
     * @param lon        Longitude pengguna saat ini
     * @param explorerId ID Explorer yang sedang login
     * @return Map berisi daftar situs terdekat dan situs yang otomatis dikunjungi
     */
    public Map<String, Object> geofenceCheckin(
        double lat,
        double lon,
        Long explorerId
    ) {
        Map<String, Object> result = new LinkedHashMap<>();

        Explorer explorer = getExplorerById(explorerId);
        if (explorer == null) {
            result.put("success", false);
            result.put(
                "message",
                "Pengguna tidak ditemukan. Silakan login kembali."
            );
            return result;
        }

        List<HeritageSite> allSitesList = siteRepository.findAll();
        List<Map<String, Object>> allSitesWithDistance = new ArrayList<>();
        List<Map<String, Object>> autoVisited = new ArrayList<>();
        boolean leveledUp = false;

        for (HeritageSite site : allSitesList) {
            double distance = HaversineUtil.calculateDistance(
                lat,
                lon,
                site.getLatitude(),
                site.getLongitude()
            );

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("siteId", site.getId());
            entry.put("siteName", site.getName());
            entry.put("era", site.getEra());
            entry.put("distance", Math.round(distance));
            entry.put("latitude", site.getLatitude());
            entry.put("longitude", site.getLongitude());
            entry.put("alreadyVisited", explorer.hasVisited(site.getId()));
            entry.put("inRange", distance <= GEOFENCE_RADIUS_METERS);
            entry.put("autoVisited", false);

            allSitesWithDistance.add(entry);

            if (
                distance <= GEOFENCE_RADIUS_METERS &&
                !explorer.hasVisited(site.getId())
            ) {
                explorer.visit(site);
                explorer.recordVisit(site, java.time.LocalDateTime.now());
                if (explorer.addXp(100)) {
                    leveledUp = true;
                }
                entry.put("autoVisited", true);
                autoVisited.add(entry);
            }
        }

        // Urutkan semua situs berdasarkan jarak terdekat
        allSitesWithDistance.sort((a, b) ->
            Long.compare((Long) a.get("distance"), (Long) b.get("distance"))
        );

        // Ambil 5 situs terdekat untuk ditampilkan
        List<Map<String, Object>> nearestSites = allSitesWithDistance.subList(
            0,
            Math.min(5, allSitesWithDistance.size())
        );

        // Simpan perubahan jika ada yang dikunjungi
        List<Badge> newBadges = new ArrayList<>();
        if (!autoVisited.isEmpty()) {
            explorerRepository.save(explorer);
            newBadges = checkAndAwardBadges(explorer);
            explorerRepository.save(explorer);
        }

        result.put("success", true);
        result.put("autoVisited", autoVisited);
        result.put("nearestSites", nearestSites);
        result.put("newBadges", newBadges);
        result.put("leveledUp", leveledUp);
        result.put("radius", (int) GEOFENCE_RADIUS_METERS);
        result.put("newXp", explorer.getXp());
        result.put("newLevel", explorer.getLevel());
        result.put(
            "message",
            autoVisited.isEmpty()
                ? "Tidak ada situs baru dalam radius " +
                      (int) GEOFENCE_RADIUS_METERS +
                      " meter."
                : autoVisited.size() +
                      " situs otomatis dikunjungi karena Anda berada dalam radius " +
                      (int) GEOFENCE_RADIUS_METERS +
                      " meter!"
        );

        return result;
    }

    public void resetExplorer(Long explorerId) {
        Explorer explorer = getExplorerById(explorerId);
        if (explorer != null) {
            explorer.reset();
            explorerRepository.save(explorer);

            // Delete only reviews made by this explorer
            List<Review> allReviews = reviewRepository.findAll();
            for (Review rev : allReviews) {
                if (
                    rev.getExplorer() != null &&
                    rev.getExplorer().getId().equals(explorerId)
                ) {
                    reviewRepository.delete(rev);
                }
            }
        }
    }

    // ===== ADMIN: SITE CRUD =====

    public HeritageSite createSite(HeritageSite site) {
        return siteRepository.save(site);
    }

    public HeritageSite updateSite(String id, HeritageSite updated) {
        HeritageSite existing = siteRepository.findById(id).orElse(null);
        if (existing == null) return null;
        existing.setName(updated.getName());
        existing.setLatitude(updated.getLatitude());
        existing.setLongitude(updated.getLongitude());
        existing.setDescription(updated.getDescription());
        existing.setEra(updated.getEra());
        existing.setStatus(updated.getStatus());
        existing.setImageUrl(updated.getImageUrl());
        if (updated.getQuiz() != null) {
            existing.setQuiz(updated.getQuiz());
        }
        return siteRepository.save(existing);
    }

    public boolean deleteSite(String id) {
        if (!siteRepository.existsById(id)) return false;
        siteRepository.deleteById(id);
        return true;
    }

    // ===== ADMIN: TRAIL CRUD =====

    public Trail createTrail(String id, String name, List<String> siteIds) {
        List<HeritageSite> route = new ArrayList<>();
        for (String sid : siteIds) {
            siteRepository.findById(sid).ifPresent(route::add);
        }
        Trail trail = new Trail(id, name, route);
        return trailRepository.save(trail);
    }

    public Trail updateTrail(String id, String name, List<String> siteIds) {
        Trail existing = trailRepository.findById(id).orElse(null);
        if (existing == null) return null;
        existing.setName(name);
        List<HeritageSite> route = new ArrayList<>();
        for (String sid : siteIds) {
            siteRepository.findById(sid).ifPresent(route::add);
        }
        existing.setRoute(route);
        return trailRepository.save(existing);
    }

    public boolean deleteTrail(String id) {
        if (!trailRepository.existsById(id)) return false;
        trailRepository.deleteById(id);
        return true;
    }

    // ===== ADMIN: BADGE CRUD =====

    public com.medanheritage.model.Badge createBadge(com.medanheritage.model.Badge badge) {
        return badgeRepository.save(badge);
    }

    public com.medanheritage.model.Badge updateBadge(String id, com.medanheritage.model.Badge updated) {
        com.medanheritage.model.Badge existing = badgeRepository.findById(id).orElse(null);
        if (existing == null) return null;
        existing.setName(updated.getName());
        existing.setTrailId(updated.getTrailId());
        existing.setDescription(updated.getDescription());
        existing.setConditionType(updated.getConditionType());
        existing.setCategoryName(updated.getCategoryName());
        existing.setRequiredVisits(updated.getRequiredVisits());
        existing.setTimePeriodValue(updated.getTimePeriodValue());
        existing.setTimePeriodUnit(updated.getTimePeriodUnit());
        return badgeRepository.save(existing);
    }

    public boolean deleteBadge(String id) {
        if (!badgeRepository.existsById(id)) return false;
        badgeRepository.deleteById(id);
        return true;
    }

    public List<Explorer> getAllExplorers() {
        return explorerRepository.findAll();
    }
}
