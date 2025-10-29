package com.pumaprintables.platform.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pumaprintables.platform.domain.model.Product;
import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.ProductRepository;
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

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class ProductControllerTest {

    private static final String ADMIN_USERNAME = "product-admin";
    private static final String ADMIN_PASSWORD = "Admin@123";
    private static final String PRODUCT_IMAGE_URL = "https://images.example.com/products/hoodie.png";

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
    private ProductRepository productRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setupData() {
        productRepository.deleteAll();
        userRepository.deleteAll();

        User admin = User.builder()
            .username(ADMIN_USERNAME)
            .password(passwordEncoder.encode(ADMIN_PASSWORD))
            .email("product-admin@example.com")
            .role(UserRole.ADMIN)
            .build();
        userRepository.save(admin);
    }

    @Test
    void whenCreateProduct_thenProductIsPersisted() throws Exception {
        String adminToken = obtainToken();

        ObjectNode specifications = objectMapper.createObjectNode();
        specifications.put("material", "cotton");
        specifications.put("size", "L");

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("sku", "SKU-1000");
        payload.put("name", "Puma Hoodie");
        payload.put("description", "Warm fleece hoodie");
    payload.put("imageUrl", PRODUCT_IMAGE_URL);
        payload.put("price", 2499.00);
        payload.set("specifications", specifications);
        payload.put("stockQuantity", 50);
        payload.put("active", true);

        mockMvc.perform(post("/api/v1/products")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.sku").value("SKU-1000"))
            .andExpect(jsonPath("$.imageUrl").value(PRODUCT_IMAGE_URL))
            .andExpect(jsonPath("$.active").value(true));

        Product savedProduct = productRepository.findBySku("SKU-1000").orElseThrow();
        assertThat(savedProduct.getImageUrl()).isEqualTo(PRODUCT_IMAGE_URL);
    }

    @Test
    void whenGetProducts_thenReturnsList() throws Exception {
        String adminToken = obtainToken();

        Product product = Product.builder()
            .sku("SKU-2000")
            .name("Puma T-Shirt")
            .description("Breathable sports tee")
            .imageUrl(PRODUCT_IMAGE_URL)
            .price(new BigDecimal("1299.00"))
            .specifications(objectMapper.readTree("{\"material\":\"polyester\"}"))
            .stockQuantity(100)
            .active(true)
            .build();
        productRepository.save(product);

        mockMvc.perform(get("/api/v1/products")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].sku").value("SKU-2000"))
            .andExpect(jsonPath("$[0].imageUrl").value(PRODUCT_IMAGE_URL));
    }

    private String obtainToken() throws Exception {
        ObjectNode loginPayload = objectMapper.createObjectNode();
        loginPayload.put("username", ADMIN_USERNAME);
        loginPayload.put("password", ADMIN_PASSWORD);

        var response = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginPayload)))
            .andExpect(status().isOk())
            .andReturn();

        return objectMapper.readTree(response.getResponse().getContentAsString()).get("token").asText();
    }
}
