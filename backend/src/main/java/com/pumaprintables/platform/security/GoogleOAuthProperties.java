package com.pumaprintables.platform.security;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "puma.security.google")
public class GoogleOAuthProperties {

    /**
     * Flag to enable Google Sign-In processing.
     */
    private boolean enabled = false;

    /**
     * Accepted Google OAuth client IDs.
     */
    private List<String> clientIds = new ArrayList<>();

    /**
     * Optional hosted domain (e.g. company.com) to enforce.
     */
    private String hostedDomain;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public List<String> getClientIds() {
        return clientIds;
    }

    public void setClientIds(List<String> clientIds) {
        this.clientIds = clientIds;
    }

    public String getHostedDomain() {
        return hostedDomain;
    }

    public void setHostedDomain(String hostedDomain) {
        this.hostedDomain = hostedDomain;
    }
}
