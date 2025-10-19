package com.pumaprintables.platform.web.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record ProductRequest(
    @NotBlank(message = "SKU is required") String sku,
    @NotBlank(message = "Name is required") String name,
    @NotBlank(message = "Description is required") String description,
    @NotNull(message = "Price is required") @DecimalMin(value = "0.0", inclusive = false, message = "Price must be positive") BigDecimal price,
    @NotNull(message = "Specifications are required") JsonNode specifications,
    @NotNull(message = "Stock quantity is required") @PositiveOrZero(message = "Stock cannot be negative") Integer stockQuantity,
    Boolean active
) {
}
