package com.pumaprintables.platform.web.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponse(
    UUID productId,
    String productName,
    String imageUrl,
    Integer quantity,
    BigDecimal unitPrice,
    BigDecimal lineTotal
) {
}
