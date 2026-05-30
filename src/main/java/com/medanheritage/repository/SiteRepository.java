package com.medanheritage.repository;

import com.medanheritage.model.HeritageSite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SiteRepository extends JpaRepository<HeritageSite, String> {
    List<HeritageSite> findByNameContainingIgnoreCase(String name);
    List<HeritageSite> findByStatusContainingIgnoreCase(String status);
}
