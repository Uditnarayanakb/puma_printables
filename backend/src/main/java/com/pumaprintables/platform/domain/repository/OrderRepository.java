package com.pumaprintables.platform.domain.repository;

import com.pumaprintables.platform.domain.model.Order;
import com.pumaprintables.platform.domain.model.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    List<Order> findByStatus(OrderStatus status);

    @Query("select o from Order o where o.user.id = :userId")
    List<Order> findByUserId(@Param("userId") UUID userId);
}
