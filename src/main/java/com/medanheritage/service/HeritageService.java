package com.medanheritage.service;

import com.medanheritage.model.Badge;
import com.medanheritage.model.Explorer;
import com.medanheritage.model.HeritageSite;
import com.medanheritage.model.Trail;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;

@Service
public class HeritageService {

    private final Map<String, HeritageSite> sites = new LinkedHashMap<>();
    private final Map<String, Trail> trails = new LinkedHashMap<>();
    private final Map<String, Badge> badgeDefinitions = new LinkedHashMap<>();
    private final Explorer explorer = new Explorer("Default Explorer");

    @PostConstruct
    public void init() {
        HeritageSite s01 = new HeritageSite(
                "S01", "Istana Maimun",
                3.5753, 98.6837,
                "Istana Maimun adalah istana Kesultanan Deli yang dibangun pada tahun 1888 oleh Sultan Ma'mun Al Rashid Perkasa Alam. Istana ini merupakan salah satu ikon kota Medan dan menjadi saksi sejarah kejayaan Kesultanan Melayu Deli.",
                "Kesultanan Deli (1888)", "Cagar Budaya"
        );
        HeritageSite s02 = new HeritageSite(
                "S02", "Masjid Raya Al-Mashun",
                3.5747, 98.6833,
                "Masjid Raya Al-Mashun dibangun pada tahun 1906 atas perintah Sultan Ma'mun Al Rashid. Arsitekturnya memadukan gaya Timur Tengah, India, dan Spanyol, menjadikannya salah satu masjid terindah di Indonesia.",
                "Kesultanan Deli (1906)", "Cagar Budaya"
        );
        HeritageSite s03 = new HeritageSite(
                "S03", "Tjong A Fie Mansion",
                3.5894, 98.6831,
                "Tjong A Fie Mansion adalah rumah peninggalan Tjong A Fie, seorang dermawan dan tokoh Tionghoa berpengaruh di Medan pada awal abad ke-20. Bangunan bergaya Tiongkok-Eropa ini kini menjadi museum.",
                "Kolonial (awal abad ke-20)", "Museum"
        );
        HeritageSite s04 = new HeritageSite(
                "S04", "Kantor Pos Medan",
                3.5880, 98.6790,
                "Kantor Pos Medan adalah bangunan bersejarah bergaya arsitektur kolonial Belanda yang dibangun pada masa Hindia Belanda. Hingga kini masih berfungsi sebagai kantor pos.",
                "Kolonial Belanda", "Bangunan Bersejarah"
        );
        HeritageSite s05 = new HeritageSite(
                "S05", "Balai Kota Lama",
                3.5890, 98.6800,
                "Balai Kota Lama Medan merupakan gedung peninggalan pemerintahan kolonial Belanda. Bangunan ini menjadi simbol pemerintahan kota Medan pada masa lampau dengan arsitektur Eropa klasik.",
                "Kolonial Belanda", "Bangunan Bersejarah"
        );
        HeritageSite s06 = new HeritageSite(
                "S06", "Gedung London Sumatra",
                3.5900, 98.6780,
                "Gedung London Sumatra (Lonsum) merupakan kantor pusat perusahaan perkebunan Inggris yang didirikan pada masa kolonial. Bangunan megah ini menjadi saksi sejarah industri perkebunan di Sumatera Utara.",
                "Kolonial Belanda (1906)", "Bangunan Bersejarah"
        );
        HeritageSite s07 = new HeritageSite(
                "S07", "Stasiun Kereta Api Medan",
                3.5870, 98.6830,
                "Stasiun Kereta Api Medan atau Stasiun Besar Medan dibangun pada era kolonial Belanda sebagai simpul transportasi utama. Arsitekturnya bergaya Art Deco yang masih terjaga hingga kini.",
                "Kolonial Belanda (1886)", "Infrastruktur Bersejarah"
        );
        HeritageSite s08 = new HeritageSite(
                "S08", "Kuil Shri Mariamman",
                3.5890, 98.6845,
                "Kuil Shri Mariamman adalah kuil Hindu tertua di kota Medan yang dibangun pada tahun 1884. Kuil ini menampilkan arsitektur Dravidian khas India Selatan dengan gopuram yang berwarna-warni.",
                "Era Kolonial (1884)", "Tempat Ibadah Bersejarah"
        );
        HeritageSite s09 = new HeritageSite(
                "S09", "Taman Sri Deli",
                3.5760, 98.6830,
                "Taman Sri Deli merupakan taman bersejarah yang terletak di depan Istana Maimun. Taman ini menjadi ruang terbuka publik yang menyimpan memori sejarah Kesultanan Deli dan kehidupan masyarakat Medan tempo dulu.",
                "Kesultanan Deli", "Taman Bersejarah"
        );
        HeritageSite s10 = new HeritageSite(
                "S10", "Gedung Bank Indonesia Medan",
                3.5885, 98.6775,
                "Gedung Bank Indonesia Medan dulunya merupakan kantor De Javasche Bank yang dibangun pada tahun 1909. Bangunan bergaya neoklasik Eropa ini menjadi salah satu landmark arsitektur kolonial di pusat kota Medan.",
                "Kolonial Belanda (1909)", "Bangunan Bersejarah"
        );

        sites.put(s01.getId(), s01);
        sites.put(s02.getId(), s02);
        sites.put(s03.getId(), s03);
        sites.put(s04.getId(), s04);
        sites.put(s05.getId(), s05);
        sites.put(s06.getId(), s06);
        sites.put(s07.getId(), s07);
        sites.put(s08.getId(), s08);
        sites.put(s09.getId(), s09);
        sites.put(s10.getId(), s10);

        Trail t1 = new Trail("T01", "Jejak Kesultanan Deli", Arrays.asList(s01, s02, s09));
        Trail t2 = new Trail("T02", "Jejak Kolonial Medan", Arrays.asList(s04, s05, s03, s06, s10));
        Trail t3 = new Trail("T03", "Jejak Multikultur Medan", Arrays.asList(s08, s03, s07));

        trails.put(t1.getId(), t1);
        trails.put(t2.getId(), t2);
        trails.put(t3.getId(), t3);

        badgeDefinitions.put("B01", new Badge("B01", "Penjelajah Kesultanan", "T01", "Menyelesaikan Trail Jejak Kesultanan Deli"));
        badgeDefinitions.put("B02", new Badge("B02", "Penjelajah Kolonial", "T02", "Menyelesaikan Trail Jejak Kolonial Medan"));
        badgeDefinitions.put("B03", new Badge("B03", "Penjelajah Multikultur", "T03", "Menyelesaikan Trail Jejak Multikultur Medan"));
    }

    public List<HeritageSite> getAllSites() {
        return new ArrayList<>(sites.values());
    }

    public HeritageSite getSiteById(String id) {
        return sites.get(id);
    }

    public List<Trail> getAllTrails() {
        return new ArrayList<>(trails.values());
    }

    public Trail getTrailById(String id) {
        return trails.get(id);
    }

    public Explorer getExplorer() {
        return explorer;
    }

    public Map<String, Object> visitSite(String siteId) {
        Map<String, Object> result = new LinkedHashMap<>();
        HeritageSite site = sites.get(siteId);

        if (site == null) {
            result.put("success", false);
            result.put("message", "Situs dengan ID '" + siteId + "' tidak ditemukan.");
            return result;
        }

        if (explorer.hasVisited(siteId)) {
            result.put("success", false);
            result.put("message", "Anda sudah pernah mengunjungi " + site.getName() + ". Tidak dapat mengunjungi situs yang sama dua kali.");
            return result;
        }

        explorer.visit(site);
        List<Badge> newBadges = checkAndAwardBadges();
        result.put("success", true);
        result.put("message", "Berhasil mengunjungi " + site.getName() + ".");
        result.put("site", site);
        result.put("newBadges", newBadges);
        return result;
    }

    public Map<String, Object> followTrail(String trailId) {
        Map<String, Object> result = new LinkedHashMap<>();
        Trail trail = trails.get(trailId);

        if (trail == null) {
            result.put("success", false);
            result.put("message", "Trail dengan ID '" + trailId + "' tidak ditemukan.");
            return result;
        }

        List<Map<String, Object>> details = new ArrayList<>();
        int visited = 0;
        int skipped = 0;

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
                entry.put("action", "VISITED");
                entry.put("reason", "Berhasil dikunjungi");
                visited++;
            }
            details.add(entry);
        }

        result.put("success", true);
        result.put("trailName", trail.getName());
        result.put("message", "Trail '" + trail.getName() + "' selesai diproses. " + visited + " situs dikunjungi, " + skipped + " situs dilewati.");
        result.put("details", details);
        List<Badge> newBadges = checkAndAwardBadges();
        result.put("newBadges", newBadges);
        return result;
    }

    private List<Badge> checkAndAwardBadges() {
        List<Badge> newlyEarned = new ArrayList<>();
        for (Map.Entry<String, Badge> entry : badgeDefinitions.entrySet()) {
            Badge badge = entry.getValue();
            if (explorer.hasBadge(badge.getId())) {
                continue;
            }
            Trail trail = trails.get(badge.getTrailId());
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

    public void resetExplorer() {
        explorer.reset();
    }
}
