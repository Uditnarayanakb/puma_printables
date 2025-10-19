package com.pumaprintables.platform.web.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

public record CourierInfoRequest(
    @NotBlank(message = "Courier name is required") String courierName,
    @NotBlank(message = "Tracking number is required") String trackingNumber,
    @NotNull(message = "Dispatch date is required")
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    OffsetDateTime dispatchDate
) {
}
