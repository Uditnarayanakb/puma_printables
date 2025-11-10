package com.pumaprintables.platform.web.dto;

public record UserMetricsResponse(
    long totalUsers,
    long activeUsers,
    long storeUsers,
    long approvers,
    long fulfillmentAgents,
    long admins,
    int lookbackDays
) {
}
