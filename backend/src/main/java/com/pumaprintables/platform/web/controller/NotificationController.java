package com.pumaprintables.platform.web.controller;

import com.pumaprintables.platform.domain.model.NotificationLog;
import com.pumaprintables.platform.service.NotificationQueryService;
import com.pumaprintables.platform.web.dto.NotificationLogResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private static final int MAX_LIMIT = 100;
    private final NotificationQueryService notificationQueryService;

    public NotificationController(NotificationQueryService notificationQueryService) {
        this.notificationQueryService = notificationQueryService;
    }

    @PreAuthorize("hasAnyRole('STORE_USER','APPROVER','ADMIN')")
    @GetMapping
    public List<NotificationLogResponse> listNotifications(@RequestParam(name = "limit", defaultValue = "20") int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
        List<NotificationLog> logs = notificationQueryService.latestNotifications(safeLimit);
        return logs.stream()
            .map(log -> new NotificationLogResponse(
                log.getId(),
                log.getSubject(),
                log.getRecipients(),
                log.getBody(),
                log.getCreatedAt()
            ))
            .toList();
    }
}
