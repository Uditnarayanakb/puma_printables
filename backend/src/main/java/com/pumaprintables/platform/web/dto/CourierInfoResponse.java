package com.pumaprintables.platform.web.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;

import java.time.OffsetDateTime;

public record CourierInfoResponse(
    String courierName,
    String trackingNumber,
    @JsonSerialize(using = ToStringSerializer.class) OffsetDateTime dispatchDate
) {
}
