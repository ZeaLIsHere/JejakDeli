package com.medanheritage.model;

import java.util.ArrayList;
import java.util.List;

public class Explorer {

    private String name;
    private HeritageSite currentLocation;
    private List<HeritageSite> visitedSites;
    private List<Badge> earnedBadges;

    public Explorer() {
        this.visitedSites = new ArrayList<>();
        this.earnedBadges = new ArrayList<>();
    }

    public Explorer(String name) {
        this.name = name;
        this.visitedSites = new ArrayList<>();
        this.earnedBadges = new ArrayList<>();
    }

    public boolean hasVisited(String siteId) {
        for (HeritageSite site : visitedSites) {
            if (site.getId().equals(siteId)) {
                return true;
            }
        }
        return false;
    }

    public boolean visit(HeritageSite site) {
        if (hasVisited(site.getId())) {
            return false;
        }
        this.currentLocation = site;
        this.visitedSites.add(site);
        return true;
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

    public void reset() {
        this.currentLocation = null;
        this.visitedSites.clear();
        this.earnedBadges.clear();
    }
}
