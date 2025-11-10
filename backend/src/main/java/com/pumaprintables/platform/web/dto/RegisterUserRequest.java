package com.pumaprintables.platform.web.dto;

import com.pumaprintables.platform.domain.model.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterUserRequest(
    @NotBlank(message = "Username is required") String username,
    @NotBlank(message = "Password is required") String password,
    @Email(message = "Email must be valid") String email,
    @Size(max = 150, message = "Full name must be 150 characters or fewer") String fullName,
    UserRole role
) {
}
