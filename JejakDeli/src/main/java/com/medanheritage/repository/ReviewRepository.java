package com.medanheritage.repository;

import com.medanheritage.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findBySiteIdOrderByCreatedAtDesc(String siteId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.siteId = :siteId")
    Double findAverageRatingBySiteId(@Param("siteId") String siteId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.siteId = :siteId")
    Long countBySiteId(@Param("siteId") String siteId);
}

