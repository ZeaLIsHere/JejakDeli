package com.medanheritage.controller;

import com.medanheritage.model.*;
import com.medanheritage.service.HeritageService;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final HeritageService heritageService;

    public AdminController(HeritageService heritageService) {
        this.heritageService = heritageService;
    }

    // Helper: cek apakah session adalah admin
    private boolean isAdmin(HttpSession session) {
        Long explorerId = (Long) session.getAttribute("currentExplorerId");
        if (explorerId == null) return false;
        Explorer explorer = heritageService.getExplorerById(explorerId);
        return explorer != null && explorer.isAdmin();
    }

    private ResponseEntity<Map<String, Object>> forbidden() {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", false);
        res.put("message", "Akses ditolak. Hanya admin yang dapat melakukan operasi ini.");
        return ResponseEntity.status(403).body(res);
    }

    // ===== DASHBOARD STATS =====
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats(HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalSites", heritageService.getAllSites().size());
        stats.put("totalTrails", heritageService.getAllTrails().size());
        stats.put("totalBadges", heritageService.getAllBadges().size());
        stats.put("totalUsers", heritageService.getAllExplorers().size());
        return ResponseEntity.ok(stats);
    }

    // ===== USERS =====
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        List<Explorer> users = heritageService.getAllExplorers();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Explorer u : users) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("email", u.getEmail());
            m.put("role", u.getRole());
            m.put("level", u.getLevel());
            m.put("xp", u.getXp());
            m.put("visitedCount", u.getVisitedSites() != null ? u.getVisitedSites().size() : 0);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    // ===== SITES =====
    @GetMapping("/sites")
    public ResponseEntity<?> getAllSites(HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        return ResponseEntity.ok(heritageService.getAllSites());
    }

    @PostMapping("/sites")
    public ResponseEntity<Map<String, Object>> createSite(
            @RequestBody HeritageSite site,
            HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        Map<String, Object> res = new LinkedHashMap<>();
        if (site.getId() == null || site.getId().isBlank()) {
            res.put("success", false);
            res.put("message", "ID situs tidak boleh kosong.");
            return ResponseEntity.badRequest().body(res);
        }
        HeritageSite saved = heritageService.createSite(site);
        res.put("success", true);
        res.put("message", "Situs berhasil ditambahkan.");
        res.put("site", saved);
        return ResponseEntity.ok(res);
    }

    @PutMapping("/sites/{id}")
    public ResponseEntity<Map<String, Object>> updateSite(
            @PathVariable String id,
            @RequestBody HeritageSite site,
            HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        Map<String, Object> res = new LinkedHashMap<>();
        HeritageSite updated = heritageService.updateSite(id, site);
        if (updated == null) {
            res.put("success", false);
            res.put("message", "Situs tidak ditemukan.");
            return ResponseEntity.notFound().build();
        }
        res.put("success", true);
        res.put("message", "Situs berhasil diperbarui.");
        res.put("site", updated);
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/sites/{id}")
    public ResponseEntity<Map<String, Object>> deleteSite(
            @PathVariable String id,
            HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        if ("S01".equalsIgnoreCase(id) || "S02".equalsIgnoreCase(id) || "S09".equalsIgnoreCase(id)) {
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", false);
            res.put("message", "Situs dengan ID " + id.toUpperCase() + " tidak dapat dihapus karena merupakan data bawaan sistem.");
            return ResponseEntity.badRequest().body(res);
        }
        Map<String, Object> res = new LinkedHashMap<>();
        boolean deleted = heritageService.deleteSite(id);
        if (!deleted) {
            res.put("success", false);
            res.put("message", "Situs tidak ditemukan.");
            return ResponseEntity.notFound().build();
        }
        res.put("success", true);
        res.put("message", "Situs berhasil dihapus.");
        return ResponseEntity.ok(res);
    }

    // ===== TRAILS =====
    @GetMapping("/trails")
    public ResponseEntity<?> getAllTrails(HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        // Sertakan siteIds array agar frontend mudah membaca urutan
        List<Map<String, Object>> result = new ArrayList<>();
        for (Trail t : heritageService.getAllTrails()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            m.put("route", t.getRoute());
            List<String> ids = new ArrayList<>();
            if (t.getRoute() != null) {
                for (HeritageSite s : t.getRoute()) ids.add(s.getId());
            }
            m.put("siteIds", ids);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/trails")
    public ResponseEntity<Map<String, Object>> createTrail(
            @RequestBody Map<String, Object> body,
            HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        Map<String, Object> res = new LinkedHashMap<>();
        String id = (String) body.get("id");
        String name = (String) body.get("name");
        @SuppressWarnings("unchecked")
        List<String> siteIds = (List<String>) body.getOrDefault("siteIds",
                body.get("routeSiteIds"));
        if (id == null || id.isBlank() || name == null || name.isBlank()) {
            res.put("success", false);
            res.put("message", "ID dan nama trail tidak boleh kosong.");
            return ResponseEntity.badRequest().body(res);
        }
        Trail saved = heritageService.createTrail(id, name, siteIds != null ? siteIds : new ArrayList<>());
        res.put("success", true);
        res.put("message", "Trail berhasil ditambahkan.");
        res.put("trail", saved);
        return ResponseEntity.ok(res);
    }

    @PutMapping("/trails/{id}")
    public ResponseEntity<Map<String, Object>> updateTrail(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        Map<String, Object> res = new LinkedHashMap<>();
        String name = (String) body.get("name");
        @SuppressWarnings("unchecked")
        List<String> siteIds = (List<String>) body.getOrDefault("siteIds",
                body.get("routeSiteIds"));
        Trail updated = heritageService.updateTrail(id, name, siteIds != null ? siteIds : new ArrayList<>());
        if (updated == null) {
            res.put("success", false);
            res.put("message", "Trail tidak ditemukan.");
            return ResponseEntity.notFound().build();
        }
        res.put("success", true);
        res.put("message", "Trail berhasil diperbarui.");
        res.put("trail", updated);
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/trails/{id}")
    public ResponseEntity<Map<String, Object>> deleteTrail(
            @PathVariable String id,
            HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        Map<String, Object> res = new LinkedHashMap<>();
        boolean deleted = heritageService.deleteTrail(id);
        if (!deleted) {
            res.put("success", false);
            res.put("message", "Trail tidak ditemukan.");
            return ResponseEntity.notFound().build();
        }
        res.put("success", true);
        res.put("message", "Trail berhasil dihapus.");
        return ResponseEntity.ok(res);
    }

    // ===== BADGES =====
    @GetMapping("/badges")
    public ResponseEntity<?> getAllBadges(HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        return ResponseEntity.ok(heritageService.getAllBadges());
    }

    @PostMapping("/badges")
    public ResponseEntity<Map<String, Object>> createBadge(
            @RequestBody Badge badge,
            HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        Map<String, Object> res = new LinkedHashMap<>();
        if (badge.getId() == null || badge.getId().isBlank()) {
            res.put("success", false);
            res.put("message", "ID badge tidak boleh kosong.");
            return ResponseEntity.badRequest().body(res);
        }
        Badge saved = heritageService.createBadge(badge);
        res.put("success", true);
        res.put("message", "Badge berhasil ditambahkan.");
        res.put("badge", saved);
        return ResponseEntity.ok(res);
    }

    @PutMapping("/badges/{id}")
    public ResponseEntity<Map<String, Object>> updateBadge(
            @PathVariable String id,
            @RequestBody Badge badge,
            HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        Map<String, Object> res = new LinkedHashMap<>();
        Badge updated = heritageService.updateBadge(id, badge);
        if (updated == null) {
            res.put("success", false);
            res.put("message", "Badge tidak ditemukan.");
            return ResponseEntity.notFound().build();
        }
        res.put("success", true);
        res.put("message", "Badge berhasil diperbarui.");
        res.put("badge", updated);
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/badges/{id}")
    public ResponseEntity<Map<String, Object>> deleteBadge(
            @PathVariable String id,
            HttpSession session) {
        if (!isAdmin(session)) return forbidden();
        Map<String, Object> res = new LinkedHashMap<>();
        boolean deleted = heritageService.deleteBadge(id);
        if (!deleted) {
            res.put("success", false);
            res.put("message", "Badge tidak ditemukan.");
            return ResponseEntity.notFound().build();
        }
        res.put("success", true);
        res.put("message", "Badge berhasil dihapus.");
        return ResponseEntity.ok(res);
    }

    // ===== CHECK ADMIN STATUS =====
    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkAdmin(HttpSession session) {
        Long explorerId = (Long) session.getAttribute("currentExplorerId");
        Map<String, Object> res = new LinkedHashMap<>();
        if (explorerId == null) {
            res.put("isAdmin", false);
            return ResponseEntity.ok(res);
        }
        Explorer explorer = heritageService.getExplorerById(explorerId);
        res.put("isAdmin", explorer != null && explorer.isAdmin());
        if (explorer != null) res.put("username", explorer.getUsername());
        return ResponseEntity.ok(res);
    }
}
