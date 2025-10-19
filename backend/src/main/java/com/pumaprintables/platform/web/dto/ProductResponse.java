package com.pumaprintables.platform.web.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProductResponse(
    UUID id,
    String sku,
    String name,
    String description,
    BigDecimal price,
    JsonNode specifications,
    Integer stockQuantity,
    Boolean active,
    @JsonSerialize(using = ToStringSerializer.class) OffsetDateTime createdAt
) {
}
