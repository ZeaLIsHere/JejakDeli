package com.medanheritage.model;

public class HeritageSite extends Location {

    private String era;
    private String status;

    public HeritageSite() {
        super();
    }

    public HeritageSite(String id, String name, double latitude, double longitude,
                        String description, String era, String status) {
        super(id, name, latitude, longitude, description);
        this.era = era;
        this.status = status;
    }

    public String getEra() {
        return era;
    }

    public void setEra(String era) {
        this.era = era;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
