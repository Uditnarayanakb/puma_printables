package com.pumaprintables.platform.domain.repository;

import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.AuthProvider;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByAuthProviderAndProviderSubject(AuthProvider provider, String providerSubject);

    List<User> findByRole(UserRole role);

    List<User> findByFirstLoginAtGreaterThanEqual(OffsetDateTime firstLoginAt);

    long countByRole(UserRole role);

    long countByLastLoginAtGreaterThanEqual(OffsetDateTime lastLoginAt);
}
