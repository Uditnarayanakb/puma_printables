package com.pumaprintables.platform.domain.repository;

import com.pumaprintables.platform.domain.model.AuditLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLogEntry, UUID> {

    List<AuditLogEntry> findByEntityNameAndEntityIdOrderByTimestampDesc(String entityName, UUID entityId);
}
