package com.pumaprintables.platform.service;

import com.pumaprintables.platform.domain.model.NotificationLog;
import com.pumaprintables.platform.domain.repository.NotificationLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationQueryService {

    private final NotificationLogRepository notificationLogRepository;

    public NotificationQueryService(NotificationLogRepository notificationLogRepository) {
        this.notificationLogRepository = notificationLogRepository;
    }

    public List<NotificationLog> latestNotifications(int limit) {
        return notificationLogRepository
            .findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")))
            .getContent();
    }
}
