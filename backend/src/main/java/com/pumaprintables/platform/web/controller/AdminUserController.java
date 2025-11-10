package com.pumaprintables.platform.web.controller;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;

import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.service.UserAdminService;
import com.pumaprintables.platform.service.UserOnboardingService;
import com.pumaprintables.platform.service.UserAdminService.UserMetrics;
import com.pumaprintables.platform.service.exception.UserNotFoundException;
import com.pumaprintables.platform.web.dto.ManagedUserResponse;
import com.pumaprintables.platform.web.dto.UpdateUserRoleRequest;
import com.pumaprintables.platform.web.dto.UserMetricsResponse;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private static final int MAX_LOOKBACK_DAYS = 180;
    private static final DateTimeFormatter FILE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final UserOnboardingService userOnboardingService;
    private final UserAdminService userAdminService;

    public AdminUserController(UserOnboardingService userOnboardingService, UserAdminService userAdminService) {
        this.userOnboardingService = userOnboardingService;
        this.userAdminService = userAdminService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping(value = "/onboarding/export", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportOnboardingReport(@RequestParam(name = "days", defaultValue = "30") int days) {
        int sanitizedDays = Math.min(Math.max(days, 1), MAX_LOOKBACK_DAYS);
        OffsetDateTime since = OffsetDateTime.now().minusDays(sanitizedDays);
        byte[] data = userOnboardingService.exportSince(since);

        HttpHeaders headers = buildHeaders(sanitizedDays);
        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/metrics")
    public ResponseEntity<UserMetricsResponse> getMetrics(@RequestParam(name = "days", defaultValue = "30") int days) {
        UserMetrics metrics = userAdminService.getMetrics(days);
        UserMetricsResponse response = new UserMetricsResponse(
            metrics.totalUsers(),
            metrics.activeUsers(),
            metrics.storeUsers(),
            metrics.approvers(),
            metrics.fulfillmentAgents(),
            metrics.admins(),
            metrics.lookbackDays()
        );
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<ManagedUserResponse>> listUsers() {
        List<ManagedUserResponse> users = userAdminService.getAllUsers().stream()
            .map(this::toManagedUserResponse)
            .toList();
        return ResponseEntity.ok(users);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{userId}/role")
    public ResponseEntity<ManagedUserResponse> updateUserRole(@PathVariable UUID userId,
                                                              @RequestBody @Valid UpdateUserRoleRequest request) {
        try {
            User updated = userAdminService.updateUserRole(userId, request.role());
            return ResponseEntity.ok(toManagedUserResponse(updated));
        } catch (UserNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
    }

    private HttpHeaders buildHeaders(int days) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        String filename = "onboarding-" + FILE_DATE_FORMAT.format(OffsetDateTime.now()) + "-last-" + days + "-days.xlsx";
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build());
        headers.setCacheControl("no-store, max-age=0");
        return headers;
    }

    private ManagedUserResponse toManagedUserResponse(User user) {
        return new ManagedUserResponse(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getRole(),
            user.getAuthProvider(),
            user.getFullName(),
            user.getFirstLoginAt(),
            user.getLastLoginAt(),
            user.getLoginCount()
        );
    }
}
