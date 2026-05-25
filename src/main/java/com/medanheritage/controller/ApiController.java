package com.medanheritage.controller;

import com.medanheritage.model.Explorer;
import com.medanheritage.model.HeritageSite;
import com.medanheritage.model.Trail;
import com.medanheritage.service.HeritageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final HeritageService heritageService;

    public ApiController(HeritageService heritageService) {
        this.heritageService = heritageService;
    }

    @GetMapping("/sites")
    public List<HeritageSite> getAllSites() {
        return heritageService.getAllSites();
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

    @PostMapping("/visit/{siteId}")
    public ResponseEntity<Map<String, Object>> visitSite(@PathVariable String siteId) {
        Map<String, Object> result = heritageService.visitSite(siteId);
        boolean success = (boolean) result.get("success");
        if (success) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.badRequest().body(result);
    }

    @PostMapping("/trail/{trailId}")
    public ResponseEntity<Map<String, Object>> followTrail(@PathVariable String trailId) {
        Map<String, Object> result = heritageService.followTrail(trailId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/explorer")
    public Map<String, Object> getExplorer() {
        Explorer explorer = heritageService.getExplorer();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("name", explorer.getName());
        data.put("currentLocation", explorer.getCurrentLocation());
        data.put("visitedSites", explorer.getVisitedSites());
        data.put("earnedBadges", explorer.getEarnedBadges());
        return data;
    }

    @PostMapping("/reset")
    public Map<String, Object> resetExplorer() {
        heritageService.resetExplorer();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "Riwayat kunjungan berhasil direset.");
        return result;
    }
}
