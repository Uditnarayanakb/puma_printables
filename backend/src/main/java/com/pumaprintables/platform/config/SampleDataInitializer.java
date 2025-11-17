package com.pumaprintables.platform.config;

import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.AuthProvider;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(value = "puma.seed.enabled", havingValue = "true", matchIfMissing = true)
public class SampleDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleDataInitializer.class);

    private static final String STORE_USERNAME = "flow-store";
    private static final String STORE_PASSWORD = "Store@123";
    private static final String STORE_EMAIL = "flow-store@example.com";

    private static final String APPROVER_USERNAME = "flow-approver";
    private static final String APPROVER_PASSWORD = "Approve@123";
    private static final String APPROVER_EMAIL = "flow-approver@example.com";

    private static final String FULFILLMENT_USERNAME = "flow-fulfillment";
    private static final String FULFILLMENT_PASSWORD = "Fulfill@123";
    private static final String FULFILLMENT_EMAIL = "flow-fulfillment@example.com";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SampleDataInitializer(UserRepository userRepository,
                                 PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        ensureUserExists(STORE_USERNAME, STORE_PASSWORD, STORE_EMAIL, UserRole.STORE_USER);
        ensureUserExists(APPROVER_USERNAME, APPROVER_PASSWORD, APPROVER_EMAIL, UserRole.APPROVER);
        ensureUserExists(FULFILLMENT_USERNAME, FULFILLMENT_PASSWORD, FULFILLMENT_EMAIL, UserRole.FULFILLMENT_AGENT);
    }

    private void ensureUserExists(String username, String rawPassword, String email, UserRole role) {
        userRepository.findByUsername(username)
            .orElseGet(() -> createUser(username, rawPassword, email, role));
    }

    private User createUser(String username, String rawPassword, String email, UserRole role) {
        User user = User.builder()
            .username(username)
            .password(passwordEncoder.encode(rawPassword))
            .email(email)
            .role(role)
            .authProvider(AuthProvider.LOCAL)
            .loginCount(0)
            .build();
        User saved = userRepository.save(user);
        log.info("Seeded default user {} with role {}", username, role);
        return saved;
    }
}
