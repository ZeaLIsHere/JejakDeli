package com.medanheritage.model;

import java.util.ArrayList;
import java.util.List;

public class Trail {

    private String id;
    private String name;
    private List<HeritageSite> route;

    public Trail() {
        this.route = new ArrayList<>();
    }

    public Trail(String id, String name, List<HeritageSite> route) {
        this.id = id;
        this.name = name;
        this.route = route != null ? new ArrayList<>(route) : new ArrayList<>();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<HeritageSite> getRoute() {
        return route;
    }

    public void setRoute(List<HeritageSite> route) {
        this.route = route;
    }
}
