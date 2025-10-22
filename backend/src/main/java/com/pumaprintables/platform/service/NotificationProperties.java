package com.pumaprintables.platform.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "puma.notifications")
public class NotificationProperties {

    /**
     * Enables or disables outbound email notifications without code changes.
     */
    private boolean enabled = true;

    /**
     * From address included on all notification emails so recipients can reply or filter.
     */
    private String fromAddress = "notifications@pumaprintables.local";

    /**
     * Whether approvers should get copied when a new order enters the queue.
     */
    private boolean copyApproversOnCreation = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getFromAddress() {
        return fromAddress;
    }

    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    public boolean isCopyApproversOnCreation() {
        return copyApproversOnCreation;
    }

    public void setCopyApproversOnCreation(boolean copyApproversOnCreation) {
        this.copyApproversOnCreation = copyApproversOnCreation;
    }
}
