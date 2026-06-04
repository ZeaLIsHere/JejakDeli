package com.medanheritage.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "badge")
public class Badge {

    @Id
    private String id;
    private String name;
    private String trailId;
    private String description;

    // New fields for expanded badge criteria
    private String conditionType; // "TRAIL", "CATEGORY", "CUSTOM"
    private String categoryName; // For CATEGORY type: "Cagar Budaya", "Museum", etc.
    private Integer requiredVisits; // For CUSTOM type: number of sites to visit
    private Integer timePeriodValue; // For CUSTOM type: time period value
    private String timePeriodUnit; // For CUSTOM type: "JAM", "HARI", "BULAN"

    public Badge() {
    }

    public Badge(String id, String name, String trailId, String description) {
        this.id = id;
        this.name = name;
        this.trailId = trailId;
        this.description = description;
        this.conditionType = "TRAIL"; // default for backward compatibility
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

    public String getConditionType() {
        return conditionType;
    }

    public void setConditionType(String conditionType) {
        this.conditionType = conditionType;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public Integer getRequiredVisits() {
        return requiredVisits;
    }

    public void setRequiredVisits(Integer requiredVisits) {
        this.requiredVisits = requiredVisits;
    }

    public Integer getTimePeriodValue() {
        return timePeriodValue;
    }

    public void setTimePeriodValue(Integer timePeriodValue) {
        this.timePeriodValue = timePeriodValue;
    }

    public String getTimePeriodUnit() {
        return timePeriodUnit;
    }

    public void setTimePeriodUnit(String timePeriodUnit) {
        this.timePeriodUnit = timePeriodUnit;
    }
}
