package com.pumaprintables.platform.web.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record ProductRequest(
    @NotBlank(message = "SKU is required") String sku,
    @NotBlank(message = "Name is required") String name,
    @NotBlank(message = "Description is required") String description,
    String imageUrl,
    @NotNull(message = "Specifications are required") JsonNode specifications,
    @NotNull(message = "Stock quantity is required") @PositiveOrZero(message = "Stock cannot be negative") Integer stockQuantity,
    Boolean active
) {
}
