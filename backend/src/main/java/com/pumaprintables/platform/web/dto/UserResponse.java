package com.pumaprintables.platform.web.dto;

import com.pumaprintables.platform.domain.model.enums.UserRole;

import java.util.UUID;

public record UserResponse(UUID id, String username, String email, UserRole role) {
}
