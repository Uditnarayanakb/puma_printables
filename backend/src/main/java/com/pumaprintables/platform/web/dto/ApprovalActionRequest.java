package com.pumaprintables.platform.web.dto;

import jakarta.validation.constraints.NotBlank;

public record ApprovalActionRequest(
    @NotBlank(message = "Comments are required") String comments
) {
}
