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
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

        Product hoodie = ensureProduct(HOODIE_SKU,
            "Puma Heritage Hoodie",
            "Premium fleece hoodie with retro chest branding.",
            new BigDecimal("2499.00"),
            25,
            specs(Map.of("material", "Cotton", "color", "Black", "fit", "Regular")),
            true);

        Product tshirt = ensureProduct(TSHIRT_SKU,
            "Puma Active Tee",
            "Lightweight performance tee ready for runs and workouts.",
            new BigDecimal("1299.00"),
            40,
            specs(Map.of("material", "Poly Blend", "color", "Electric Blue", "fit", "Athletic")),
            true);

        seedAdditionalCatalog();

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

    private Product ensureProduct(String sku, String name, String description, BigDecimal price, int stock, ObjectNode specs, boolean active) {
        return productRepository.findBySku(sku)
            .map(existing -> updateExisting(existing, active, sku))
            .orElseGet(() -> createProduct(sku, name, description, price, stock, specs, active));
    }

    private Product updateExisting(Product product, boolean active, String sku) {
        boolean dirty = false;
        if (product.getActive() != active) {
            product.setActive(active);
            dirty = true;
        }
        if (product.getImageUrl() == null || product.getImageUrl().isBlank()) {
            product.setImageUrl(sampleImageForSku(sku));
            dirty = true;
        }
        return dirty ? productRepository.save(product) : product;
    }

    private Product createProduct(String sku, String name, String description, BigDecimal price, int stock, ObjectNode specs, boolean active) {
        Product product = Product.builder()
            .sku(sku)
            .name(name)
            .description(description)
            .price(price)
            .imageUrl(sampleImageForSku(sku))
            .specifications(specs)
            .stockQuantity(stock)
            .active(active)
            .build();
        return productRepository.save(product);
    }

    private ObjectNode specs(Map<String, String> entries) {
        ObjectNode node = objectMapper.createObjectNode();
        entries.forEach(node::put);
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

    private void seedAdditionalCatalog() {
        Map<String, ProductSeed> seeds = new LinkedHashMap<>();
        seeds.put("CAT-JACKET-003", new ProductSeed("Puma Storm Jacket", "Weatherproof shell for outdoor runs.", new BigDecimal("4999.00"), 18, true, Map.of("material", "Nylon", "color", "Storm Grey", "fit", "Slim")));
        seeds.put("CAT-SHORT-004", new ProductSeed("Puma Training Shorts", "Breathable shorts with zip pockets.", new BigDecimal("1499.00"), 60, true, Map.of("material", "Polyester", "color", "Crimson", "inseam", "7")));
        seeds.put("CAT-TRACK-005", new ProductSeed("Puma Track Pants", "Tapered pants with ankle zips.", new BigDecimal("2799.00"), 32, true, Map.of("material", "Fleece", "color", "Navy", "fit", "Tapered")));
        seeds.put("CAT-SOCK-006", new ProductSeed("Puma Comfort Socks", "Pack of 3 cushioned ankle socks.", new BigDecimal("699.00"), 120, true, Map.of("material", "Cotton", "color", "White", "pack", "3")));
        seeds.put("CAT-CAP-007", new ProductSeed("Puma Sport Cap", "Moisture-wicking curved visor cap.", new BigDecimal("999.00"), 80, true, Map.of("material", "Polyester", "color", "Charcoal", "adjustable", "Yes")));
        seeds.put("CAT-BAG-008", new ProductSeed("Puma Gear Duffel", "45L duffel with ventilated shoe pocket.", new BigDecimal("3499.00"), 22, true, Map.of("material", "Ripstop", "color", "Black", "capacity", "45L")));
        seeds.put("CAT-BOTTLE-009", new ProductSeed("Puma Steel Bottle", "750ml insulated bottle keeps drinks cold.", new BigDecimal("1299.00"), 55, true, Map.of("material", "Stainless Steel", "color", "Ice Blue", "capacity", "750ml")));
        seeds.put("CAT-BAND-010", new ProductSeed("Puma Resistance Bands", "Set of 3 loop bands for strength.", new BigDecimal("1199.00"), 70, true, Map.of("material", "Latex", "levels", "3", "usage", "Strength")));
        seeds.put("CAT-YOGA-011", new ProductSeed("Puma Yoga Mat", "Non-slip mat with 5mm cushioning.", new BigDecimal("1999.00"), 35, true, Map.of("material", "TPE", "thickness", "5mm", "color", "Sea Foam")));
        seeds.put("CAT-HAT-012", new ProductSeed("Puma Beanie", "Rib-knit beanie with fleece lining.", new BigDecimal("1299.00"), 44, false, Map.of("material", "Acrylic", "color", "Midnight", "season", "Winter")));
        seeds.put("CAT-SCARF-013", new ProductSeed("Puma Travel Scarf", "Convertible scarf with zip stash pocket.", new BigDecimal("1599.00"), 28, false, Map.of("material", "Poly Blend", "color", "Graphite", "feature", "Pocket")));
        seeds.put("CAT-GLOVE-014", new ProductSeed("Puma Training Gloves", "Grip-enhanced gloves for lifting.", new BigDecimal("1799.00"), 36, true, Map.of("material", "Leather", "color", "Black", "size", "M")));
        seeds.put("CAT-SHOE-015", new ProductSeed("Puma Velocity Nitro", "Daily trainer with responsive cushioning.", new BigDecimal("8999.00"), 50, true, Map.of("material", "Mesh", "color", "Lava", "drop", "8mm")));
        seeds.put("CAT-SHOE-016", new ProductSeed("Puma Deviate Elite", "Carbon-plated racer built for marathon day.", new BigDecimal("12999.00"), 20, true, Map.of("material", "Mesh", "color", "Sunset", "drop", "6mm")));
        seeds.put("CAT-LS-017", new ProductSeed("Puma Long Sleeve Tee", "Soft-touch tee for transitional weather.", new BigDecimal("1699.00"), 62, true, Map.of("material", "Modal Blend", "color", "Silver", "fit", "Athletic")));
        seeds.put("CAT-BRA-018", new ProductSeed("Puma Support Bra", "High-impact support with mesh back.", new BigDecimal("2299.00"), 48, true, Map.of("material", "Poly Blend", "color", "Coral", "support", "High")));
        seeds.put("CAT-TANK-019", new ProductSeed("Puma Training Tank", "Laser-cut ventilation panels keep you cool.", new BigDecimal("1399.00"), 58, true, Map.of("material", "Polyester", "color", "Mint", "fit", "Relaxed")));
        seeds.put("CAT-TEE-020", new ProductSeed("Puma Graphic Tee", "Limited edition artist collaboration tee.", new BigDecimal("1899.00"), 30, true, Map.of("material", "Cotton", "color", "Ink Blue", "collection", "City Pulse")));
        seeds.put("CAT-CREW-021", new ProductSeed("Puma Crew Sweatshirt", "Loopback crew with tonal branding.", new BigDecimal("2599.00"), 38, true, Map.of("material", "French Terry", "color", "Cloud", "fit", "Regular")));
        seeds.put("CAT-PARKA-022", new ProductSeed("Puma Expedition Parka", "700-fill parka built for extreme cold.", new BigDecimal("14999.00"), 12, false, Map.of("material", "Down", "color", "Arctic", "rating", "-20C")));
        seeds.put("CAT-TEE-023", new ProductSeed("Puma Kids Tee", "Kids graphic tee with glow print.", new BigDecimal("899.00"), 75, true, Map.of("material", "Cotton", "color", "Neon Green", "age", "8-10")));
        seeds.put("CAT-HOODIE-024", new ProductSeed("Puma Zip Hoodie", "Double-knit zip hoodie for daily wear.", new BigDecimal("2999.00"), 46, true, Map.of("material", "Cotton Blend", "color", "Plum", "fit", "Regular")));
        seeds.put("CAT-BOTTOM-025", new ProductSeed("Puma Joggers", "Slim joggers with cargo pocket.", new BigDecimal("2399.00"), 54, true, Map.of("material", "French Terry", "color", "Olive", "fit", "Slim")));
        seeds.put("CAT-SHORT-026", new ProductSeed("Puma Bike Shorts", "Supportive bike shorts with phone pocket.", new BigDecimal("1699.00"), 42, true, Map.of("material", "Nylon Blend", "color", "Black", "inseam", "8")));
        seeds.put("CAT-SOCK-027", new ProductSeed("Puma Crew Socks", "Pack of 6 cushioned crew socks.", new BigDecimal("1199.00"), 210, true, Map.of("material", "Cotton", "color", "Assorted", "pack", "6")));
        seeds.put("CAT-TEE-028", new ProductSeed("Puma Heritage Tee", "Classic logo tee in washed dye.", new BigDecimal("1599.00"), 68, true, Map.of("material", "Cotton", "color", "Vintage Red", "fit", "Relaxed")));

        seeds.forEach((sku, seed) -> ensureProduct(
            sku,
            seed.name,
            seed.description,
            seed.price,
            seed.stock,
            specs(seed.specifications),
            seed.active
        ));
    }

    private record ProductSeed(String name, String description, BigDecimal price, int stock, boolean active, Map<String, String> specifications) {
    }

    private String sampleImageForSku(String sku) {
        String base = "https://images.unsplash.com/";
        if (sku.startsWith("CAT-HOODIE")) {
            return base + "photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-TEE") || sku.startsWith("CAT-LS") || sku.startsWith("CAT-TANK")) {
            return base + "photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-JACKET")) {
            return base + "photo-1524578271613-d550eacf6090?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-TRACK")) {
            return base + "photo-1542293787938-4d2226c75ff3?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-SHORT") || sku.startsWith("CAT-BOTTOM") || sku.startsWith("CAT-JOGG")) {
            return base + "photo-1526413231329-37cdab2370cc?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-SHOE")) {
            return base + "photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-BAG")) {
            return base + "photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-BOTTLE")) {
            return base + "photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-YOGA")) {
            return base + "photo-1526401485004-46910ecc8e51?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-CAP")) {
            return base + "photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-SOCK")) {
            return base + "photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-BRA")) {
            return base + "photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-GLOVE")) {
            return base + "photo-1542293787938-4d2226c75ff3?auto=format&fit=crop&w=1200&q=80";
        }
        if (sku.startsWith("CAT-SCARF") || sku.startsWith("CAT-HAT")) {
            return base + "photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80";
        }
        return base + "photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80";
    }
}
