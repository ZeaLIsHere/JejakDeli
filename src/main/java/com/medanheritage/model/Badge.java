package com.medanheritage.model;

public class Badge {

    private String id;
    private String name;
    private String trailId;
    private String description;

    public Badge() {
    }

    public Badge(String id, String name, String trailId, String description) {
        this.id = id;
        this.name = name;
        this.trailId = trailId;
        this.description = description;
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

    public String getTrailId() {
        return trailId;
    }

    public void setTrailId(String trailId) {
        this.trailId = trailId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
