package com.pumaprintables.platform.web.controller;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pumaprintables.platform.service.UserOnboardingService;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private static final int MAX_LOOKBACK_DAYS = 180;
    private static final DateTimeFormatter FILE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final UserOnboardingService userOnboardingService;

    public AdminUserController(UserOnboardingService userOnboardingService) {
        this.userOnboardingService = userOnboardingService;
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

    private HttpHeaders buildHeaders(int days) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        String filename = "onboarding-" + FILE_DATE_FORMAT.format(OffsetDateTime.now()) + "-last-" + days + "-days.xlsx";
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build());
        headers.setCacheControl("no-store, max-age=0");
        return headers;
    }
}
