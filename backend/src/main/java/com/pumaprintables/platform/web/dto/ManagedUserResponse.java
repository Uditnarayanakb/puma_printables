package com.pumaprintables.platform.web.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.pumaprintables.platform.domain.model.enums.AuthProvider;
import com.pumaprintables.platform.domain.model.enums.UserRole;

public record ManagedUserResponse(
    UUID id,
    String username,
    String email,
    UserRole role,
    AuthProvider authProvider,
    String fullName,
    @JsonSerialize(using = ToStringSerializer.class) OffsetDateTime firstLoginAt,
    @JsonSerialize(using = ToStringSerializer.class) OffsetDateTime lastLoginAt,
    Integer loginCount
) {
}
