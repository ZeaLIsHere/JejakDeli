package com.medanheritage.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "trail")
public class Trail {

    @Id
    private String id;
    private String name;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "trail_route_sites",
        joinColumns = @JoinColumn(name = "trail_id"),
        inverseJoinColumns = @JoinColumn(name = "site_id")
    )
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
