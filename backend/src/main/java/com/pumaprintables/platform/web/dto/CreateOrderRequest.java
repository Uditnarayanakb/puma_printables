package com.pumaprintables.platform.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateOrderRequest(
    @NotBlank(message = "Shipping address is required") String shippingAddress,
    String customerGst,
    @NotEmpty(message = "At least one item is required") List<@Valid OrderItemRequest> items
) {
}
