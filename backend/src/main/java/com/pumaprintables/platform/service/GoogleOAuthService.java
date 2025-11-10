package com.pumaprintables.platform.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.pumaprintables.platform.security.GoogleOAuthProperties;
import com.pumaprintables.platform.service.exception.GoogleOAuthDisabledException;
import com.pumaprintables.platform.service.exception.GoogleOAuthTokenInvalidException;

@Service
public class GoogleOAuthService {

    private static final Logger log = LoggerFactory.getLogger(GoogleOAuthService.class);

    private final GoogleOAuthProperties properties;
    private final GoogleIdTokenVerifier verifier;

    public GoogleOAuthService(GoogleOAuthProperties properties) {
        this.properties = properties;
        this.verifier = buildVerifier(properties.getClientIds());
    }

    public GoogleProfile verifyCredential(String credential) {
        if (!properties.isEnabled()) {
            throw new GoogleOAuthDisabledException();
        }
        try {
            GoogleIdToken idToken = verifier.verify(credential);
            if (idToken == null) {
                throw new GoogleOAuthTokenInvalidException("Unable to verify Google credential");
            }
            Payload payload = idToken.getPayload();
            validateHostedDomain(payload);
            return toProfile(payload);
        } catch (GeneralSecurityException | IOException ex) {
            log.warn("Failed to validate Google token", ex);
            throw new GoogleOAuthTokenInvalidException("Google credential could not be verified", ex);
        }
    }

    private void validateHostedDomain(Payload payload) {
        String requiredHd = properties.getHostedDomain();
        if (!StringUtils.hasText(requiredHd)) {
            return;
        }
        String tokenHd = payload.getHostedDomain();
        if (!Objects.equals(requiredHd, tokenHd)) {
            throw new GoogleOAuthTokenInvalidException("Google account is not part of the allowed domain");
        }
    }

    private GoogleProfile toProfile(Payload payload) {
        String email = payload.getEmail();
        Boolean emailVerified = payload.getEmailVerified();
        if (!StringUtils.hasText(email) || Boolean.FALSE.equals(emailVerified)) {
            throw new GoogleOAuthTokenInvalidException("Google account email must be verified");
        }
        String subject = payload.getSubject();
        String fullName = (String) payload.get("name");
        String picture = (String) payload.get("picture");
        String locale = (String) payload.get("locale");
        String givenName = (String) payload.get("given_name");
        String familyName = (String) payload.get("family_name");
        OffsetDateTime authTime = null;
        Object authTimeClaim = payload.get("auth_time");
        if (authTimeClaim instanceof Number number) {
            Instant instant = Instant.ofEpochSecond(number.longValue());
            authTime = OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
        }
        return new GoogleProfile(subject, email, fullName, picture, locale, givenName, familyName, authTime);
    }

    private GoogleIdTokenVerifier buildVerifier(List<String> clientIds) {
        List<String> sanitizedIds = clientIds == null ? List.of() : clientIds.stream()
            .filter(StringUtils::hasText)
            .collect(Collectors.toList());
        if (sanitizedIds.isEmpty()) {
            log.warn("Google OAuth enabled but no client IDs configured; login attempts will fail");
        }
        return new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), JacksonFactory.getDefaultInstance())
            .setAudience(sanitizedIds)
            .setIssuer("https://accounts.google.com")
            .build();
    }

    public record GoogleProfile(
        String subject,
        String email,
        String fullName,
        String pictureUrl,
        String locale,
        String givenName,
        String familyName,
        OffsetDateTime authenticatedAt
    ) {
    }
}
