package com.pumaprintables.platform.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AcceptOrderRequest(
    @NotBlank(message = "Delivery address is required") String deliveryAddress
) {
}
