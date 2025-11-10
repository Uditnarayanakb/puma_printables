package com.pumaprintables.platform.web.dto;

import com.pumaprintables.platform.domain.model.enums.AuthProvider;
import com.pumaprintables.platform.domain.model.enums.UserRole;

import java.util.UUID;

public record CurrentUserResponse(
    UUID id,
    String username,
    String email,
    UserRole role,
    AuthProvider authProvider,
    String fullName,
    String avatarUrl
) {
}
