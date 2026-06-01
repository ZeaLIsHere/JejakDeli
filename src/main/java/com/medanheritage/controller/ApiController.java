package com.medanheritage.controller;

import com.medanheritage.model.Explorer;
import com.medanheritage.model.HeritageSite;
import com.medanheritage.model.Review;
import com.medanheritage.model.Trail;
import com.medanheritage.service.HeritageService;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final HeritageService heritageService;

    public ApiController(HeritageService heritageService) {
        this.heritageService = heritageService;
    }

    @GetMapping("/sites")
    public List<HeritageSite> getAllSites(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String category
    ) {
        return heritageService.getSites(search, category);
    }

    @GetMapping("/sites/{id}")
    public ResponseEntity<HeritageSite> getSite(@PathVariable String id) {
        HeritageSite site = heritageService.getSiteById(id);
        if (site == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(site);
    }

    @GetMapping("/trails")
    public List<Trail> getAllTrails() {
        return heritageService.getAllTrails();
    }

    @GetMapping("/trails/{id}")
    public ResponseEntity<Trail> getTrail(@PathVariable String id) {
        Trail trail = heritageService.getTrailById(id);
        if (trail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(trail);
    }

    @GetMapping("/badges")
    public List<com.medanheritage.model.Badge> getAllBadges() {
        return heritageService.getAllBadges();
    }

    @PostMapping("/visit/{siteId}")
    public ResponseEntity<Map<String, Object>> visitSite(
        @PathVariable String siteId,
        @RequestParam(required = false) String answer,
        HttpSession session
    ) {
        Long explorerId = (Long) session.getAttribute("currentExplorerId");
        if (explorerId == null) {
            return ResponseEntity.status(401).body(
                Map.of(
                    "success",
                    false,
                    "message",
                    "Silakan login terlebih dahulu."
                )
            );
        }
        Map<String, Object> result = heritageService.visitSite(
            siteId,
            answer,
            explorerId
        );
        boolean success = (boolean) result.get("success");
        if (success) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.badRequest().body(result);
    }

    @PostMapping("/trail/{trailId}")
    public ResponseEntity<Map<String, Object>> followTrail(
        @PathVariable String trailId,
        HttpSession session
    ) {
        Long explorerId = (Long) session.getAttribute("currentExplorerId");
        if (explorerId == null) {
            return ResponseEntity.status(401).body(
                Map.of(
                    "success",
                    false,
                    "message",
                    "Silakan login terlebih dahulu."
                )
            );
        }
        Map<String, Object> result = heritageService.followTrail(
            trailId,
            explorerId
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/explorer")
    public ResponseEntity<Map<String, Object>> getExplorer(
        HttpSession session
    ) {
        Long explorerId = (Long) session.getAttribute("currentExplorerId");
        if (explorerId == null) {
            return ResponseEntity.status(401).build();
        }
        Explorer explorer = heritageService.getExplorerById(explorerId);
        if (explorer == null) {
            return ResponseEntity.status(401).build();
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("name", explorer.getName());
        data.put("currentLocation", explorer.getCurrentLocation());
        data.put("visitedSites", explorer.getVisitedSites());
        data.put("earnedBadges", explorer.getEarnedBadges());
        data.put("xp", explorer.getXp());
        data.put("level", explorer.getLevel());
        return ResponseEntity.ok(data);
    }

    // Reviews endpoints
    @GetMapping("/sites/{siteId}/reviews")
    public List<Review> getSiteReviews(@PathVariable String siteId) {
        return heritageService.getReviewsBySite(siteId);
    }

    @PostMapping("/sites/{siteId}/reviews")
    public ResponseEntity<Review> addSiteReview(
        @PathVariable String siteId,
        @RequestParam int rating,
        @RequestParam String comment,
        HttpSession session
    ) {
        Long explorerId = (Long) session.getAttribute("currentExplorerId");
        if (explorerId == null) {
            return ResponseEntity.status(401).build();
        }
        Review review = heritageService.addReview(
            siteId,
            rating,
            comment,
            explorerId
        );
        return ResponseEntity.ok(review);
    }

    /**
     * Geofence Check-in Endpoint.
     * Menerima koordinat GPS pengguna, menghitung jarak ke semua situs,
     * dan otomatis mencatat kunjungan jika dalam radius.
     *
     * @param lat     Latitude pengguna
     * @param lon     Longitude pengguna
     * @param session HTTP Session untuk mendapatkan explorerId
     */
    @PostMapping("/geofence/checkin")
    public ResponseEntity<Map<String, Object>> geofenceCheckin(
        @RequestParam double lat,
        @RequestParam double lon,
        HttpSession session
    ) {
        Long explorerId = (Long) session.getAttribute("currentExplorerId");
        if (explorerId == null) {
            return ResponseEntity.status(401).body(
                Map.of(
                    "success",
                    false,
                    "message",
                    "Silakan login terlebih dahulu."
                )
            );
        }
        Map<String, Object> result = heritageService.geofenceCheckin(
            lat,
            lon,
            explorerId
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetExplorer(
        HttpSession session
    ) {
        Long explorerId = (Long) session.getAttribute("currentExplorerId");
        if (explorerId == null) {
            return ResponseEntity.status(401).build();
        }
        heritageService.resetExplorer(explorerId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put(
            "message",
            "Riwayat kunjungan dan ulasan Anda berhasil direset."
        );
        return ResponseEntity.ok(result);
    }
}
