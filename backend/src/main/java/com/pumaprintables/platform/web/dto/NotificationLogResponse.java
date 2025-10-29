package com.pumaprintables.platform.web.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationLogResponse(
    UUID id,
    String subject,
    String recipients,
    String body,
    OffsetDateTime createdAt
) {
}
