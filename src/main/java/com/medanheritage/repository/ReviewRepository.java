package com.medanheritage.repository;

import com.medanheritage.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findBySiteIdOrderByCreatedAtDesc(String siteId);
}
