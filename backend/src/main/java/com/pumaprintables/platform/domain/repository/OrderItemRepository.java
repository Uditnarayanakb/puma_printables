package com.pumaprintables.platform.domain.repository;

import com.pumaprintables.platform.domain.model.OrderItem;
import com.pumaprintables.platform.domain.model.id.OrderItemId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, OrderItemId> {
}
