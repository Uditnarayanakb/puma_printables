package com.pumaprintables.platform.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.UserRepository;
import com.pumaprintables.platform.service.exception.UserNotFoundException;

@Service
public class UserAdminService {

    private static final int DEFAULT_ACTIVE_WINDOW_DAYS = 30;

    private final UserRepository userRepository;

    public UserAdminService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "username"));
    }

    @Transactional(readOnly = true)
    public UserMetrics getMetrics(int lookbackDays) {
        int sanitizedDays = lookbackDays > 0 ? lookbackDays : DEFAULT_ACTIVE_WINDOW_DAYS;
        OffsetDateTime cutoff = OffsetDateTime.now().minusDays(sanitizedDays);

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByLastLoginAtGreaterThanEqual(cutoff);
        long storeUsers = userRepository.countByRole(UserRole.STORE_USER);
        long approvers = userRepository.countByRole(UserRole.APPROVER);
        long fulfillmentAgents = userRepository.countByRole(UserRole.FULFILLMENT_AGENT);
        long admins = userRepository.countByRole(UserRole.ADMIN);

        return new UserMetrics(totalUsers, activeUsers, storeUsers, approvers, fulfillmentAgents, admins, sanitizedDays);
    }

    @Transactional
    public User updateUserRole(UUID userId, UserRole role) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId.toString()));

        user.setRole(role);
        return userRepository.save(user);
    }

    public record UserMetrics(
        long totalUsers,
        long activeUsers,
        long storeUsers,
        long approvers,
        long fulfillmentAgents,
        long admins,
        int lookbackDays
    ) {
    }
}
