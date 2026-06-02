package com.medanheritage.repository;

import com.medanheritage.model.HeritageSite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SiteRepository extends JpaRepository<HeritageSite, String> {
    List<HeritageSite> findByNameContainingIgnoreCase(String name);
    List<HeritageSite> findByStatusContainingIgnoreCase(String status);


    @Query("SELECT s FROM HeritageSite s WHERE " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(s.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(s.era) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:status IS NULL OR :status = '' OR :status = 'all' OR LOWER(s.status) = LOWER(:status))")
    List<HeritageSite> searchSites(@Param("search") String search, @Param("status") String status);
}
