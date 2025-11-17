package com.pumaprintables.platform.web.dto;

import java.util.UUID;

public record OrderItemResponse(
    UUID productId,
    String productName,
    String imageUrl,
    Integer quantity
) {
}
