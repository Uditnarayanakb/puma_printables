package com.pumaprintables.platform.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pumaprintables.platform.domain.model.Product;
import com.pumaprintables.platform.domain.repository.ProductRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Component
@ConditionalOnProperty(value = "puma.catalog.dynamic.enabled", havingValue = "true", matchIfMissing = true)
public class ImageCatalogInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ImageCatalogInitializer.class);
    private static final String RESOURCE_PATTERN = "classpath:/static/catalog/*.{png,jpg,jpeg}";
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^A-Z0-9]+");
    private static final int INITIAL_STOCK = 25;

    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;
    private final PathMatchingResourcePatternResolver resourceResolver;

    public ImageCatalogInitializer(ProductRepository productRepository,
                                   ObjectMapper objectMapper) {
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
        this.resourceResolver = new PathMatchingResourcePatternResolver();
    }

    @Override
    @Transactional
    public void run(String... args) throws IOException {
        Resource[] resources;
        try {
            resources = resourceResolver.getResources(RESOURCE_PATTERN);
        } catch (FileNotFoundException ex) {
            log.info("Static catalog directory not present; skipping image-backed product initialization.");
            return;
        }
        if (resources.length == 0) {
            log.info("No catalog images found in static/catalog directory.");
            return;
        }

        Set<String> processedSkus = new HashSet<>();
        for (Resource resource : resources) {
            if (!resource.isReadable()) {
                continue;
            }
            String filename = resource.getFilename();
            if (filename == null) {
                continue;
            }

            String nameWithoutExtension = stripExtension(filename);
            if (nameWithoutExtension.isBlank()) {
                continue;
            }

            String displayName = nameWithoutExtension.toUpperCase(Locale.ENGLISH);
            String sku = generateSku(displayName);
            processedSkus.add(sku);

            String imageUrl = "/catalog/" + filename;
            productRepository.findBySku(sku)
                .map(existing -> updateExisting(existing, displayName, imageUrl))
                .orElseGet(() -> createProduct(sku, displayName, imageUrl));
        }

        if (processedSkus.isEmpty()) {
            log.info("Catalog images discovered, but no valid product entries were created.");
        } else {
            log.info("Catalog initialized with {} image-backed products.", processedSkus.size());
        }
    }

    private Product updateExisting(Product existing, String name, String imageUrl) {
        boolean dirty = false;
        if (!existing.getName().equals(name)) {
            existing.setName(name);
            dirty = true;
        }
        if (existing.getImageUrl() == null || !existing.getImageUrl().equals(imageUrl)) {
            existing.setImageUrl(imageUrl);
            dirty = true;
        }
        if (existing.getDescription() == null || !existing.getDescription().equals(name)) {
            existing.setDescription(name);
            dirty = true;
        }
        if (!Boolean.TRUE.equals(existing.getActive())) {
            existing.setActive(true);
            dirty = true;
        }
        Integer currentStock = existing.getStockQuantity();
        if (currentStock == null || currentStock < INITIAL_STOCK) {
            existing.setStockQuantity(INITIAL_STOCK);
            dirty = true;
        }
        return dirty ? productRepository.save(existing) : existing;
    }

    private Product createProduct(String sku, String name, String imageUrl) {
        ObjectNode specs = objectMapper.createObjectNode();
        specs.put("source", "image-catalog");

        Product product = Product.builder()
            .sku(sku)
            .name(name)
            .description(name)
            .imageUrl(imageUrl)
            .specifications(specs)
            .stockQuantity(INITIAL_STOCK)
            .active(true)
            .build();
        Product saved = productRepository.save(product);
        log.info("Created catalog product {} ({})", name, sku);
        return saved;
    }

    private String generateSku(String name) {
        String normalized = NON_ALPHANUMERIC.matcher(name).replaceAll("-");
        normalized = normalized.replaceAll("-+", "-");
        normalized = normalized.replaceAll("(^-|-$)", "");
        if (normalized.isBlank()) {
            return "IMAGE-PRODUCT";
        }
        return normalized;
    }

    private String stripExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex <= 0) {
            return filename;
        }
        return filename.substring(0, dotIndex);
    }
}
