package com.pumaprintables.platform.domain.repository;

import com.pumaprintables.platform.domain.model.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, UUID> {
}
