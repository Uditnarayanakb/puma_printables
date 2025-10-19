package com.pumaprintables.platform.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class AuthControllerTest {

    private static final String USERNAME = "auth_test_user";
    private static final String RAW_PASSWORD = "test-password";
    private static final String ADMIN_USERNAME = "admin_test";
    private static final String ADMIN_PASSWORD = "Admin@123";

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUpUser() {
        userRepository.deleteAll();

        User user = User.builder()
            .username(USERNAME)
            .password(passwordEncoder.encode(RAW_PASSWORD))
            .email("auth-test@example.com")
            .role(UserRole.STORE_USER)
            .build();

        User admin = User.builder()
            .username(ADMIN_USERNAME)
            .password(passwordEncoder.encode(ADMIN_PASSWORD))
            .email("admin-test@example.com")
            .role(UserRole.ADMIN)
            .build();

        userRepository.save(user);
        userRepository.save(admin);
    }

    @Test
    void whenValidCredentials_thenReturnsJwtToken() throws Exception {
        var request = new LoginPayload(USERNAME, RAW_PASSWORD);

        var response = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isString())
            .andReturn();

        var token = objectMapper.readTree(response.getResponse().getContentAsString()).get("token").asText();
        assertThat(token).isNotBlank();
    }

    @Test
    void whenAdminRegistersNewUser_thenUserIsPersisted() throws Exception {
        var adminToken = obtainToken(ADMIN_USERNAME, ADMIN_PASSWORD);
        var registerPayload = new RegisterPayload("new-user", "StrongPass@1", "new-user@example.com", UserRole.STORE_USER.name());

    mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .content(objectMapper.writeValueAsString(registerPayload)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.username").value("new-user"))
            .andExpect(jsonPath("$.role").value(UserRole.STORE_USER.name()));

        assertThat(userRepository.findByUsername("new-user")).isPresent();
    }

    private String obtainToken(String username, String password) throws Exception {
        var request = new LoginPayload(username, password);

        var response = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andReturn();

        return objectMapper.readTree(response.getResponse().getContentAsString()).get("token").asText();
    }

    private record LoginPayload(String username, String password) { }

    private record RegisterPayload(String username, String password, String email, String role) { }
}
