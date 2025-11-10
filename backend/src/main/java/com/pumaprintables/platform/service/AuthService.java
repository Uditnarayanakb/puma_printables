package com.pumaprintables.platform.service;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.AuthProvider;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.UserRepository;
import com.pumaprintables.platform.security.JwtService;
import com.pumaprintables.platform.service.GoogleOAuthService;
import com.pumaprintables.platform.service.GoogleOAuthService.GoogleProfile;
import com.pumaprintables.platform.service.exception.UserAlreadyExistsException;
import com.pumaprintables.platform.service.exception.UserNotFoundException;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final GoogleOAuthService googleOAuthService;

    public AuthService(AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       GoogleOAuthService googleOAuthService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.googleOAuthService = googleOAuthService;
    }

    @Transactional
    public String authenticate(String username, String rawPassword) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(username, rawPassword));

        User user = userRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> new IllegalStateException("Authenticated user no longer exists"));

        recordSuccessfulLogin(user);
        return issueToken(user);
    }

    @Transactional
    public String authenticateWithGoogle(String credential) {
        GoogleProfile profile = googleOAuthService.verifyCredential(credential);
        User user = resolveGoogleUser(profile);
        recordSuccessfulLogin(user);
        return issueToken(user);
    }

    @Transactional
    public User register(String username, String password, String email, UserRole role, String fullName) {
        userRepository.findByUsername(username)
            .ifPresent(existing -> {
                throw new UserAlreadyExistsException(username);
            });

        User user = User.builder()
            .username(username)
            .password(passwordEncoder.encode(password))
            .email(email)
            .role(role)
            .authProvider(AuthProvider.LOCAL)
            .fullName(StringUtils.hasText(fullName) ? fullName : null)
            .loginCount(0)
            .build();
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new UserNotFoundException(username));
    }

    private String issueToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        if (StringUtils.hasText(user.getFullName())) {
            claims.put("name", user.getFullName());
        }
        if (StringUtils.hasText(user.getAvatarUrl())) {
            claims.put("avatar", user.getAvatarUrl());
        }
        if (user.getAuthProvider() != null) {
            claims.put("provider", user.getAuthProvider().name());
        }
        return jwtService.generateToken(user.getUsername(), claims);
    }

    private void recordSuccessfulLogin(User user) {
        OffsetDateTime now = OffsetDateTime.now();
        if (user.getFirstLoginAt() == null) {
            user.setFirstLoginAt(now);
        }
        user.setLastLoginAt(now);
        Integer currentCount = user.getLoginCount() == null ? 0 : user.getLoginCount();
        user.setLoginCount(currentCount + 1);
        userRepository.save(user);
    }

    private User resolveGoogleUser(GoogleProfile profile) {
        return userRepository.findByAuthProviderAndProviderSubject(AuthProvider.GOOGLE, profile.subject())
            .map(user -> updateExistingUserWithGoogleProfile(user, profile))
            .orElseGet(() -> userRepository.findByEmail(profile.email())
                .map(user -> updateExistingUserWithGoogleProfile(user, profile))
                .orElseGet(() -> createGoogleUser(profile)));
    }

    private User updateExistingUserWithGoogleProfile(User user, GoogleProfile profile) {
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setProviderSubject(profile.subject());
        user.setEmail(profile.email());
        if (StringUtils.hasText(profile.fullName())) {
            user.setFullName(profile.fullName());
        }
        if (StringUtils.hasText(profile.pictureUrl())) {
            user.setAvatarUrl(profile.pictureUrl());
        }
        if (!StringUtils.hasText(user.getUsername())) {
            user.setUsername(generateUsernameForProfile(profile));
        }
        if (user.getLoginCount() == null) {
            user.setLoginCount(0);
        }
        return userRepository.save(user);
    }

    private User createGoogleUser(GoogleProfile profile) {
        User user = User.builder()
            .username(generateUsernameForProfile(profile))
            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
            .email(profile.email())
            .role(UserRole.STORE_USER)
            .authProvider(AuthProvider.GOOGLE)
            .providerSubject(profile.subject())
            .fullName(profile.fullName())
            .avatarUrl(profile.pictureUrl())
            .loginCount(0)
            .build();
        return userRepository.save(user);
    }

    private String generateUsernameForProfile(GoogleProfile profile) {
        String email = profile.email();
        if (StringUtils.hasText(email)) {
            String normalized = email.toLowerCase();
            if (normalized.length() <= 50) {
                return normalized;
            }
        }
        String fallback = ("google-" + profile.subject()).toLowerCase();
        return fallback.length() <= 50 ? fallback : fallback.substring(0, 50);
    }
}
