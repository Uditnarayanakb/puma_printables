package com.pumaprintables.platform.web.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pumaprintables.platform.domain.model.Order;
import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.OrderStatus;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.OrderRepository;
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
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class OrderLifecycleIntegrationTest {

    private static final String ADMIN_USERNAME = "flow-admin";
    private static final String ADMIN_PASSWORD = "Admin@123";
    private static final String STORE_USERNAME = "flow-store";
    private static final String STORE_PASSWORD = "Store@123";
    private static final String APPROVER_USERNAME = "flow-approver";
    private static final String APPROVER_PASSWORD = "Approve@123";

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
    private OrderRepository orderRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
        productRepository.deleteAll();
        userRepository.deleteAll();

        User admin = User.builder()
            .username(ADMIN_USERNAME)
            .password(passwordEncoder.encode(ADMIN_PASSWORD))
            .email("flow-admin@example.com")
            .role(UserRole.ADMIN)
            .build();

        User store = User.builder()
            .username(STORE_USERNAME)
            .password(passwordEncoder.encode(STORE_PASSWORD))
            .email("flow-store@example.com")
            .role(UserRole.STORE_USER)
            .build();

        User approver = User.builder()
            .username(APPROVER_USERNAME)
            .password(passwordEncoder.encode(APPROVER_PASSWORD))
            .email("flow-approver@example.com")
            .role(UserRole.APPROVER)
            .build();

        userRepository.save(admin);
        userRepository.save(store);
        userRepository.save(approver);
    }

    @Test
    void whenOrderLifecycleRunsThroughEndpoints_thenOrderReachesInTransit() throws Exception {
        String adminToken = obtainToken(ADMIN_USERNAME, ADMIN_PASSWORD);

        ObjectNode specifications = objectMapper.createObjectNode();
        specifications.put("material", "cotton");
        specifications.put("size", "L");

        ObjectNode productPayload = objectMapper.createObjectNode();
        productPayload.put("sku", "FLOW-SKU-1");
        productPayload.put("name", "Lifecycle Hoodie");
        productPayload.put("description", "End-to-end verified hoodie");
        productPayload.put("price", 1999.00);
        productPayload.set("specifications", specifications);
        productPayload.put("stockQuantity", 30);
        productPayload.put("active", true);

        JsonNode productResponse = perform(post("/api/v1/products"), productPayload, adminToken)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.sku").value("FLOW-SKU-1"))
            .andReturn()
            .getResponse()
            .getContentAsString()
            .transform(this::readTree);

        String productId = productResponse.get("id").asText();

        String storeToken = obtainToken(STORE_USERNAME, STORE_PASSWORD);

        perform(get("/api/v1/products"), storeToken)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(productId))
            .andExpect(jsonPath("$[0].sku").value("FLOW-SKU-1"));

        ObjectNode orderPayload = objectMapper.createObjectNode();
        orderPayload.put("shippingAddress", "742 Evergreen Terrace, Springfield");
        orderPayload.put("customerGst", "GSTINFLOW01");

        ArrayNode items = objectMapper.createArrayNode();
        ObjectNode item = objectMapper.createObjectNode();
        item.put("productId", productId);
        item.put("quantity", 3);
        items.add(item);
        orderPayload.set("items", items);

        JsonNode orderResponse = perform(post("/api/v1/orders"), orderPayload, storeToken)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value(OrderStatus.PENDING_APPROVAL.name()))
            .andExpect(jsonPath("$.totalAmount").value(5997.00))
            .andReturn()
            .getResponse()
            .getContentAsString()
            .transform(this::readTree);

        String orderId = orderResponse.get("id").asText();

        String approverToken = obtainToken(APPROVER_USERNAME, APPROVER_PASSWORD);

        ObjectNode approvalPayload = objectMapper.createObjectNode();
        approvalPayload.put("comments", "Approved for full dispatch");

        perform(post("/api/v1/orders/" + orderId + "/approve"), approvalPayload, approverToken)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value(OrderStatus.APPROVED.name()));

        ObjectNode courierPayload = objectMapper.createObjectNode();
        courierPayload.put("courierName", "Delhivery");
        courierPayload.put("trackingNumber", "DL1234567890");
        courierPayload.put("dispatchDate", "2025-10-20T05:30:00Z");

        perform(post("/api/v1/orders/" + orderId + "/courier"), courierPayload, approverToken)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value(OrderStatus.IN_TRANSIT.name()))
            .andExpect(jsonPath("$.courierInfo.courierName").value("Delhivery"))
            .andExpect(jsonPath("$.courierInfo.trackingNumber").value("DL1234567890"));

        Order persistedOrder = orderRepository.findById(UUID.fromString(orderId)).orElseThrow();
        assertThat(persistedOrder.getStatus()).isEqualTo(OrderStatus.IN_TRANSIT);
        assertThat(persistedOrder.getCourierInfo()).isNotNull();
        assertThat(persistedOrder.getCourierInfo().getCourierName()).isEqualTo("Delhivery");
        assertThat(persistedOrder.getCourierInfo().getTrackingNumber()).isEqualTo("DL1234567890");
    }

    private String obtainToken(String username, String password) throws Exception {
        ObjectNode loginPayload = objectMapper.createObjectNode();
        loginPayload.put("username", username);
        loginPayload.put("password", password);

        var response = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginPayload)))
            .andExpect(status().isOk())
            .andReturn();

        return objectMapper.readTree(response.getResponse().getContentAsString()).get("token").asText();
    }

    private ResultActions perform(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder builder, ObjectNode payload, String token) throws Exception {
        return mockMvc.perform(builder
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)));
    }

    private ResultActions perform(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder builder, String token) throws Exception {
        return mockMvc.perform(builder
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    private JsonNode readTree(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse JSON", ex);
        }
    }
}
