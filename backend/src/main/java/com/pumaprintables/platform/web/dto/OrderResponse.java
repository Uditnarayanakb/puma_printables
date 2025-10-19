package com.pumaprintables.platform.web.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.pumaprintables.platform.domain.model.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    OrderStatus status,
    String shippingAddress,
    String customerGst,
    List<OrderItemResponse> items,
    BigDecimal totalAmount,
    @JsonSerialize(using = ToStringSerializer.class) OffsetDateTime createdAt
) {
}
