package com.medanheritage.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Embedded;
import jakarta.persistence.Table;

@Entity
@Table(name = "situs_sejarah")
public class HeritageSite extends Location {

    private String era;
    private String status;
    private String imageUrl;

    @Embedded
    private QuizQuestion quiz;

    private String qrCodeToken;

    public HeritageSite() {
        super();
    }

    public HeritageSite(String id, String name, double latitude, double longitude,
                        String description, String era, String status) {
        super(id, name, latitude, longitude, description);
        this.era = era;
        this.status = status;
    }

    public HeritageSite(String id, String name, double latitude, double longitude,
                        String description, String era, String status, QuizQuestion quiz) {
        super(id, name, latitude, longitude, description);
        this.era = era;
        this.status = status;
        this.quiz = quiz;
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

    public QuizQuestion getQuiz() {
        return quiz;
    }

    public void setQuiz(QuizQuestion quiz) {
        this.quiz = quiz;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getQrCodeToken() {
        return qrCodeToken;
    }

    public void setQrCodeToken(String qrCodeToken) {
        this.qrCodeToken = qrCodeToken;
    }
}
