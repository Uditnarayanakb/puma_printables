package com.pumaprintables.platform.web.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pumaprintables.platform.domain.model.Order;
import com.pumaprintables.platform.domain.model.Product;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class OrderControllerTest {

    private static final String STORE_USERNAME = "store-user";
    private static final String STORE_PASSWORD = "Store@123";
    private static final String APPROVER_USERNAME = "approver-user";
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
    void setUp() throws Exception {
        orderRepository.deleteAll();
        productRepository.deleteAll();
        userRepository.deleteAll();

        User storeUser = User.builder()
            .username(STORE_USERNAME)
            .password(passwordEncoder.encode(STORE_PASSWORD))
            .email("store@example.com")
            .role(UserRole.STORE_USER)
            .build();

        User approver = User.builder()
            .username(APPROVER_USERNAME)
            .password(passwordEncoder.encode(APPROVER_PASSWORD))
            .email("approver@example.com")
            .role(UserRole.APPROVER)
            .build();

        userRepository.save(storeUser);
        userRepository.save(approver);

        JsonNode specifications = objectMapper.readTree("{\"material\":\"polyester\",\"size\":\"L\"}");

        Product product = Product.builder()
            .sku("SKU-5000")
            .name("Puma Jacket")
            .description("Water-resistant jacket")
            .price(new BigDecimal("3499.00"))
            .specifications(specifications)
            .stockQuantity(25)
            .active(true)
            .build();
        productRepository.save(product);
    }

    @Test
    void whenStoreUserCreatesOrder_thenOrderIsPendingApproval() throws Exception {
        String token = obtainToken(STORE_USERNAME, STORE_PASSWORD);
        Product product = productRepository.findBySku("SKU-5000").orElseThrow();

        ObjectNode payload = buildOrderPayload(product.getId(), 2);

        mockMvc.perform(post("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value(OrderStatus.PENDING_APPROVAL.name()))
            .andExpect(jsonPath("$.items[0].productId").value(product.getId().toString()))
            .andExpect(jsonPath("$.totalAmount").value(6998.00));

        assertThat(orderRepository.count()).isEqualTo(1);
    }

    @Test
    void whenApproverApprovesOrder_thenStatusUpdated() throws Exception {
        Product product = productRepository.findBySku("SKU-5000").orElseThrow();
        String storeToken = obtainToken(STORE_USERNAME, STORE_PASSWORD);

        ObjectNode payload = buildOrderPayload(product.getId(), 1);

        var orderResponse = mockMvc.perform(post("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + storeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isCreated())
            .andReturn();

        String orderId = objectMapper.readTree(orderResponse.getResponse().getContentAsString()).get("id").asText();

        String approverToken = obtainToken(APPROVER_USERNAME, APPROVER_PASSWORD);
        ObjectNode approvalRequest = objectMapper.createObjectNode();
        approvalRequest.put("comments", "Looks good");

        mockMvc.perform(post("/api/v1/orders/" + orderId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + approverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(approvalRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value(OrderStatus.APPROVED.name()));

        Order order = orderRepository.findById(UUID.fromString(orderId)).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.APPROVED);
    }

    @Test
    void whenApproverAddsCourierInfo_thenOrderTransitionsToInTransit() throws Exception {
        Product product = productRepository.findBySku("SKU-5000").orElseThrow();
        String storeToken = obtainToken(STORE_USERNAME, STORE_PASSWORD);

        ObjectNode payload = buildOrderPayload(product.getId(), 1);

        var orderResponse = mockMvc.perform(post("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + storeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isCreated())
            .andReturn();

        String orderId = objectMapper.readTree(orderResponse.getResponse().getContentAsString()).get("id").asText();

        String approverToken = obtainToken(APPROVER_USERNAME, APPROVER_PASSWORD);
        ObjectNode approvalRequest = objectMapper.createObjectNode();
        approvalRequest.put("comments", "Approved for dispatch");

        mockMvc.perform(post("/api/v1/orders/" + orderId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + approverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(approvalRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value(OrderStatus.APPROVED.name()));

        String dispatchDate = OffsetDateTime.now().plusHours(2).toString();
        ObjectNode courierRequest = objectMapper.createObjectNode();
        courierRequest.put("courierName", "Bluedart");
        courierRequest.put("trackingNumber", "BD123456789");
        courierRequest.put("dispatchDate", dispatchDate);

        mockMvc.perform(post("/api/v1/orders/" + orderId + "/courier")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + approverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(courierRequest)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value(OrderStatus.IN_TRANSIT.name()))
            .andExpect(jsonPath("$.courierInfo.courierName").value("Bluedart"))
            .andExpect(jsonPath("$.courierInfo.trackingNumber").value("BD123456789"));

        Order order = orderRepository.findById(UUID.fromString(orderId)).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.IN_TRANSIT);
        assertThat(order.getCourierInfo()).isNotNull();
        assertThat(order.getCourierInfo().getCourierName()).isEqualTo("Bluedart");
        assertThat(order.getCourierInfo().getTrackingNumber()).isEqualTo("BD123456789");
    }

    private String obtainToken(String username, String password) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("username", username);
        payload.put("password", password);

        var response = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isOk())
            .andReturn();

        return objectMapper.readTree(response.getResponse().getContentAsString()).get("token").asText();
    }

    private ObjectNode buildOrderPayload(UUID productId, int quantity) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("shippingAddress", "221B Baker Street, London");
        payload.put("customerGst", "GSTIN12345");

        ArrayNode items = objectMapper.createArrayNode();
        ObjectNode item = objectMapper.createObjectNode();
        item.put("productId", productId.toString());
        item.put("quantity", quantity);
        items.add(item);

        payload.set("items", items);
        return payload;
    }
}
