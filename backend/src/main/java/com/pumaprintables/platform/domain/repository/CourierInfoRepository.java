package com.pumaprintables.platform.domain.repository;

import com.pumaprintables.platform.domain.model.CourierInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CourierInfoRepository extends JpaRepository<CourierInfo, UUID> {

    Optional<CourierInfo> findByOrderId(UUID orderId);
}
