package com.pumaprintables.platform.domain.repository;

import com.pumaprintables.platform.domain.model.Approval;
import com.pumaprintables.platform.domain.model.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApprovalRepository extends JpaRepository<Approval, UUID> {

    Optional<Approval> findByOrderId(UUID orderId);

    List<Approval> findByStatus(ApprovalStatus status);
}
