package com.pumaprintables.platform.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pumaprintables.platform.domain.model.Product;
import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.OrderRepository;
import com.pumaprintables.platform.domain.repository.ProductRepository;
import com.pumaprintables.platform.domain.repository.UserRepository;
import com.pumaprintables.platform.service.OrderService;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Component
public class SampleDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleDataInitializer.class);

    private static final String STORE_USERNAME = "flow-store";
    private static final String STORE_PASSWORD = "Store@123";
    private static final String STORE_EMAIL = "flow-store@example.com";

    private static final String APPROVER_USERNAME = "flow-approver";
    private static final String APPROVER_PASSWORD = "Approve@123";
    private static final String APPROVER_EMAIL = "flow-approver@example.com";

    private static final String HOODIE_SKU = "CAT-HOODIE-001";
    private static final String TSHIRT_SKU = "CAT-TEE-002";

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    public SampleDataInitializer(UserRepository userRepository,
                                 ProductRepository productRepository,
                                 OrderRepository orderRepository,
                                 PasswordEncoder passwordEncoder,
                                 OrderService orderService,
                                 ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.passwordEncoder = passwordEncoder;
        this.orderService = orderService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) {
        User storeUser = userRepository.findByUsername(STORE_USERNAME)
            .orElseGet(() -> createUser(STORE_USERNAME, STORE_PASSWORD, STORE_EMAIL, UserRole.STORE_USER));

        User approverUser = userRepository.findByUsername(APPROVER_USERNAME)
            .orElseGet(() -> createUser(APPROVER_USERNAME, APPROVER_PASSWORD, APPROVER_EMAIL, UserRole.APPROVER));

        Product hoodie = productRepository.findBySku(HOODIE_SKU)
            .orElseGet(() -> createProduct(HOODIE_SKU,
                "Puma Heritage Hoodie",
                "Premium fleece hoodie with retro chest branding.",
                new BigDecimal("2499.00"),
                25,
                specs("material", "Cotton", "color", "Black", "fit", "Regular")));

        Product tshirt = productRepository.findBySku(TSHIRT_SKU)
            .orElseGet(() -> createProduct(TSHIRT_SKU,
                "Puma Active Tee",
                "Lightweight performance tee ready for runs and workouts.",
                new BigDecimal("1299.00"),
                40,
                specs("material", "Poly Blend", "color", "Electric Blue", "fit", "Athletic")));

        if (orderRepository.count() == 0) {
            log.info("Seeding sample orders for demo view");
            seedOrders(storeUser, approverUser, hoodie, tshirt);
        }
    }

    private User createUser(String username, String rawPassword, String email, UserRole role) {
        User user = User.builder()
            .username(username)
            .password(passwordEncoder.encode(rawPassword))
            .email(email)
            .role(role)
            .build();
        return userRepository.save(user);
    }

    private Product createProduct(String sku, String name, String description, BigDecimal price, int stock, ObjectNode specs) {
        Product product = Product.builder()
            .sku(sku)
            .name(name)
            .description(description)
            .price(price)
            .specifications(specs)
            .stockQuantity(stock)
            .active(true)
            .build();
        return productRepository.save(product);
    }

    private ObjectNode specs(String key1, String value1, String key2, String value2, String key3, String value3) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put(key1, value1);
        node.put(key2, value2);
        node.put(key3, value3);
        return node;
    }

    private void seedOrders(User storeUser, User approverUser, Product hoodie, Product tshirt) {
        orderService.createOrder(storeUser.getUsername(),
            "742 Evergreen Terrace, Springfield",
            "GSTINFLOW01",
            List.of(new OrderService.ItemPayload(hoodie.getId(), 2)));

        var approved = orderService.createOrder(storeUser.getUsername(),
            "221B Baker Street, London",
            "GSTINFLOW02",
            List.of(new OrderService.ItemPayload(hoodie.getId(), 1),
                new OrderService.ItemPayload(tshirt.getId(), 6)));

        orderService.approveOrder(approved.getId(), approverUser.getUsername(), "Looks good for fulfillment.");
        orderService.addCourierInfo(approved.getId(), "Delhivery", "DL1234567890", OffsetDateTime.now().minusDays(1));

        var rejected = orderService.createOrder(storeUser.getUsername(),
            "31 Spooner Street, Quahog",
            "GSTINFLOW03",
            List.of(new OrderService.ItemPayload(tshirt.getId(), 4)));

        orderService.rejectOrder(rejected.getId(), approverUser.getUsername(), "Need revised artwork before printing.");
    }
}
