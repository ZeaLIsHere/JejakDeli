package com.medanheritage.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "akun_user")
public class Explorer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private String password;

    private String name;

    @ManyToOne
    @com.fasterxml.jackson.annotation.JsonIgnore
    private HeritageSite currentLocation;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_visited_sites",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "site_id")
    )
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<HeritageSite> visitedSites;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_earned_badges",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "badge_id")
    )
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Badge> earnedBadges;

    @OneToMany(mappedBy = "explorer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<SiteVisit> siteVisits = new ArrayList<>();

    private int xp;
    private int level = 1;

    private String email;

    @Column(name = "role")
    private String role = "USER";

    public Explorer() {
        this.visitedSites = new ArrayList<>();
        this.earnedBadges = new ArrayList<>();
    }

    public Explorer(String username, String password) {
        this.username = username;
        this.password = password;
        this.name = username;
        this.visitedSites = new ArrayList<>();
        this.earnedBadges = new ArrayList<>();
        this.xp = 0;
        this.level = 1;
    }

    public Explorer(String username, String email, String password, String role) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.name = username;
        this.role = role;
        this.visitedSites = new ArrayList<>();
        this.earnedBadges = new ArrayList<>();
        this.xp = 0;
        this.level = 1;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public HeritageSite getCurrentLocation() {
        return currentLocation;
    }

    public void setCurrentLocation(HeritageSite currentLocation) {
        this.currentLocation = currentLocation;
    }

    public List<HeritageSite> getVisitedSites() {
        return visitedSites;
    }

    public void setVisitedSites(List<HeritageSite> visitedSites) {
        this.visitedSites = visitedSites;
    }

    public List<Badge> getEarnedBadges() {
        return earnedBadges;
    }

    public void setEarnedBadges(List<Badge> earnedBadges) {
        this.earnedBadges = earnedBadges;
    }

    public int getXp() {
        return xp;
    }

    public void setXp(int xp) {
        this.xp = xp;
    }

    public int getLevel() {
        return level;
    }

    public void setLevel(int level) {
        this.level = level;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isAdmin() { return "ADMIN".equals(this.role); }

    public boolean addXp(int amount) {
        this.xp += amount;
        int newLevel = 1 + (this.xp / 300);
        if (newLevel > this.level) {
            this.level = newLevel;
            return true; // Leveled up
        }
        return false;
    }

    public boolean hasVisited(String siteId) {
        if (visitedSites == null) return false;
        for (HeritageSite site : visitedSites) {
            if (site.getId().equals(siteId)) {
                return true;
            }
        }
        return false;
    }

    public boolean visit(HeritageSite site) {
        if (visitedSites == null) {
            visitedSites = new ArrayList<>();
        }
        if (hasVisited(site.getId())) {
            return false;
        }
        this.currentLocation = site;
        this.visitedSites.add(site);
        return true;
    }

    public boolean hasBadge(String badgeId) {
        for (Badge b : earnedBadges) {
            if (b.getId().equals(badgeId)) {
                return true;
            }
        }
        return false;
    }

    public void addBadge(Badge badge) {
        if (!hasBadge(badge.getId())) {
            this.earnedBadges.add(badge);
        }
    }

    public List<SiteVisit> getSiteVisits() {
        return siteVisits;
    }

    public void setSiteVisits(List<SiteVisit> siteVisits) {
        this.siteVisits = siteVisits;
    }

    public void recordVisit(HeritageSite site, java.time.LocalDateTime time) {
        if (this.siteVisits == null) {
            this.siteVisits = new ArrayList<>();
        }
        this.siteVisits.add(new SiteVisit(this, site, time));
    }

    public void reset() {
        this.currentLocation = null;
        this.visitedSites.clear();
        this.earnedBadges.clear();
        this.xp = 0;
        this.level = 1;
        if (this.siteVisits != null) {
            this.siteVisits.clear();
        }
    }
}
