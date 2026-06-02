package com.medanheritage.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "kunjungan_situs")
public class SiteVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Explorer explorer;

    @ManyToOne
    private HeritageSite site;

    private LocalDateTime visitTime;

    public SiteVisit() {
    }

    public SiteVisit(Explorer explorer, HeritageSite site, LocalDateTime visitTime) {
        this.explorer = explorer;
        this.site = site;
        this.visitTime = visitTime;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Explorer getExplorer() {
        return explorer;
    }

    public void setExplorer(Explorer explorer) {
        this.explorer = explorer;
    }

    public HeritageSite getSite() {
        return site;
    }

    public void setSite(HeritageSite site) {
        this.site = site;
    }

    public LocalDateTime getVisitTime() {
        return visitTime;
    }

    public void setVisitTime(LocalDateTime visitTime) {
        this.visitTime = visitTime;
    }
}
