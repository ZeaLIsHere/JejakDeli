package com.medanheritage.repository;

import com.medanheritage.model.Explorer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExplorerRepository extends JpaRepository<Explorer, Long> {
    Optional<Explorer> findByUsername(String username);
    Optional<Explorer> findByEmail(String email);
    Optional<Explorer> findByUsernameOrEmail(String username, String email);
    List<Explorer> findByRoleNotOrderByXpDesc(String role);
}

