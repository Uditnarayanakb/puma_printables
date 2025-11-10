package com.pumaprintables.platform.web.dto;

import com.pumaprintables.platform.domain.model.enums.UserRole;

import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(
    @NotNull(message = "Role is required") UserRole role
) {
}
