package com.pumaprintables.platform.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "puma.security.jwt")
public class JwtProperties {

    /**
     * Symmetric signing key for HMAC tokens.
     */
    private String secret = "change-me-in-prod";

    /**
     * Access token validity window in minutes.
     */
    private long expiryMinutes = 60L;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpiryMinutes() {
        return expiryMinutes;
    }

    public void setExpiryMinutes(long expiryMinutes) {
        this.expiryMinutes = expiryMinutes;
    }
}
