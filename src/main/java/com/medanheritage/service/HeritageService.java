package com.medanheritage.service;

import com.medanheritage.model.*;
import com.medanheritage.repository.*;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.*;

@Service
public class HeritageService {

    private final SiteRepository siteRepository;
    private final ExplorerRepository explorerRepository;
    private final ReviewRepository reviewRepository;
    private final BadgeRepository badgeRepository;
    private final TrailRepository trailRepository;

    public HeritageService(SiteRepository siteRepository,
                           ExplorerRepository explorerRepository,
                           ReviewRepository reviewRepository,
                           BadgeRepository badgeRepository,
                           TrailRepository trailRepository) {
        this.siteRepository = siteRepository;
        this.explorerRepository = explorerRepository;
        this.reviewRepository = reviewRepository;
        this.badgeRepository = badgeRepository;
        this.trailRepository = trailRepository;
    }

    @PostConstruct
    public void init() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            InputStream inputStream = getClass().getClassLoader().getResourceAsStream("data.json");
            if (inputStream != null) {
                SeedData seed = mapper.readValue(inputStream, SeedData.class);

                // Initialize Sites if empty
                if (siteRepository.count() == 0 && seed.sites != null) {
                    siteRepository.saveAll(seed.sites);
                }

                // Initialize Badges if empty
                if (badgeRepository.count() == 0 && seed.badges != null) {
                    badgeRepository.saveAll(seed.badges);
                }

                // Initialize Trails in Database if empty
                if (trailRepository.count() == 0 && seed.trails != null) {
                    for (TrailSeed ts : seed.trails) {
                        List<HeritageSite> route = new ArrayList<>();
                        if (ts.routeSiteIds != null) {
                            for (String siteId : ts.routeSiteIds) {
                                siteRepository.findById(siteId).ifPresent(route::add);
                            }
                        }
                        trailRepository.save(new Trail(ts.id, ts.name, route));
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
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
        List<HeritageSite> all = siteRepository.findAll();
        List<HeritageSite> filtered = new ArrayList<>();
        for (HeritageSite s : all) {
            boolean matchesSearch = true;
            boolean matchesCategory = true;

            if (search != null && !search.trim().isEmpty()) {
                String query = search.toLowerCase();
                matchesSearch = s.getName().toLowerCase().contains(query) ||
                                s.getDescription().toLowerCase().contains(query) ||
                                s.getEra().toLowerCase().contains(query);
            }

            if (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("all")) {
                matchesCategory = s.getStatus().equalsIgnoreCase(category);
            }

            if (matchesSearch && matchesCategory) {
                filtered.add(s);
            }
        }
        return filtered;
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

    // Authentication Services
    public Map<String, Object> registerUser(String username, String password) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "Username dan password tidak boleh kosong.");
            return result;
        }
        if (explorerRepository.findByUsername(username.trim()).isPresent()) {
            result.put("success", false);
            result.put("message", "Username '" + username + "' sudah terdaftar.");
            return result;
        }
        Explorer explorer = new Explorer(username.trim(), password.trim());
        explorerRepository.save(explorer);
        result.put("success", true);
        result.put("message", "Registrasi berhasil! Silakan login.");
        return result;
    }

    public Explorer authenticateUser(String username, String password) {
        if (username == null || password == null) return null;
        Optional<Explorer> opt = explorerRepository.findByUsername(username.trim());
        if (opt.isPresent()) {
            Explorer exp = opt.get();
            if (exp.getPassword().equals(password.trim())) {
                return exp;
            }
        }
        return null;
    }

    public Map<String, Object> visitSite(String siteId, String selectedAnswer, Long explorerId) {
        Map<String, Object> result = new LinkedHashMap<>();
        HeritageSite site = siteRepository.findById(siteId).orElse(null);

        if (site == null) {
            result.put("success", false);
            result.put("message", "Situs dengan ID '" + siteId + "' tidak ditemukan.");
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
            result.put("message", "Anda sudah pernah mengunjungi " + site.getName() + ".");
            return result;
        }

        // Verify quiz answer
        if (site.getQuiz() != null) {
            String correctOption = site.getQuiz().getCorrectOption();
            if (selectedAnswer == null || !correctOption.equalsIgnoreCase(selectedAnswer.trim())) {
                result.put("success", false);
                result.put("message", "Jawaban kuis salah! Coba pelajari sejarah situs kembali.");
                return result;
            }
        }

        explorer.visit(site);
        boolean leveledUp = explorer.addXp(100);
        explorerRepository.save(explorer);

        List<Badge> newBadges = checkAndAwardBadges(explorer);
        explorerRepository.save(explorer);

        result.put("success", true);
        result.put("message", "Jawaban Benar! Berhasil mengunjungi " + site.getName() + ".");
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
            result.put("message", "Trail dengan ID '" + trailId + "' tidak ditemukan.");
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
        result.put("message", "Trail '" + trail.getName() + "' selesai diproses. " + visited + " situs dikunjungi, " + skipped + " situs dilewati. Bonus +" + xpGained + " XP.");
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
            Trail trail = trailRepository.findById(badge.getTrailId()).orElse(null);
            if (trail == null) {
                continue;
            }
            boolean allVisited = true;
            for (HeritageSite site : trail.getRoute()) {
                if (!explorer.hasVisited(site.getId())) {
                    allVisited = false;
                    break;
                }
            }
            if (allVisited) {
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

    public Review addReview(String siteId, int rating, String comment, Long explorerId) {
        Explorer explorer = getExplorerById(explorerId);
        if (explorer == null) return null;
        Review review = new Review(siteId, explorer, rating, comment, java.time.LocalDateTime.now());
        return reviewRepository.save(review);
    }

    public void resetExplorer(Long explorerId) {
        Explorer explorer = getExplorerById(explorerId);
        if (explorer != null) {
            explorer.reset();
            explorerRepository.save(explorer);
            
            // Delete only reviews made by this explorer
            List<Review> allReviews = reviewRepository.findAll();
            for (Review rev : allReviews) {
                if (rev.getExplorer() != null && rev.getExplorer().getId().equals(explorerId)) {
                    reviewRepository.delete(rev);
                }
            }
        }
    }
}
