package com.pumaprintables.platform.web.dto;

import com.pumaprintables.platform.domain.model.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RegisterUserRequest(
    @NotBlank(message = "Username is required") String username,
    @NotBlank(message = "Password is required") String password,
    @Email(message = "Email must be valid") String email,
    @NotNull(message = "Role is required") UserRole role
) {
}
