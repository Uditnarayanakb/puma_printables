package com.pumaprintables.platform.domain.repository;

import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByUsernameReturnsPersistedUser() {
        User stored = userRepository.save(User.builder()
            .username("store.user")
            .password("hashed")
            .role(UserRole.STORE_USER)
            .email("store.user@example.com")
            .build());

        Optional<User> result = userRepository.findByUsername("store.user");

        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(stored.getId());
        assertThat(result.get().getRole()).isEqualTo(UserRole.STORE_USER);
    }
}
