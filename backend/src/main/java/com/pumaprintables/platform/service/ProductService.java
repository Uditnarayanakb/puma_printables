package com.pumaprintables.platform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pumaprintables.platform.domain.model.Product;
import com.pumaprintables.platform.domain.repository.ProductRepository;
import com.pumaprintables.platform.service.exception.ProductNotFoundException;
import com.pumaprintables.platform.service.exception.SkuAlreadyExistsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Product getProduct(UUID id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException(id.toString()));
    }

    @Transactional
    public Product createProduct(String sku, String name, String description, java.math.BigDecimal price,
                                 JsonNode specifications, Integer stockQuantity, Boolean active) {
        productRepository.findBySku(sku)
            .ifPresent(existing -> {
                throw new SkuAlreadyExistsException(sku);
            });

        Product product = Product.builder()
            .sku(sku)
            .name(name)
            .description(description)
            .price(price)
            .specifications(specifications)
            .stockQuantity(stockQuantity)
            .active(active != null ? active : Boolean.TRUE)
            .build();

        return productRepository.save(product);
    }

    @Transactional
    public Product updateProduct(UUID id, String sku, String name, String description, java.math.BigDecimal price,
                                 JsonNode specifications, Integer stockQuantity, Boolean active) {
        Product existing = getProduct(id);

        if (!existing.getSku().equalsIgnoreCase(sku)) {
            productRepository.findBySku(sku)
                .ifPresent(conflict -> {
                    if (!conflict.getId().equals(id)) {
                        throw new SkuAlreadyExistsException(sku);
                    }
                });
        }

        existing.setSku(sku);
        existing.setName(name);
        existing.setDescription(description);
        existing.setPrice(price);
        existing.setSpecifications(specifications);
        existing.setStockQuantity(stockQuantity);
        existing.setActive(active != null ? active : existing.getActive());

        return productRepository.save(existing);
    }

    @Transactional
    public Product deactivateProduct(UUID id) {
        Product existing = getProduct(id);
        existing.setActive(Boolean.FALSE);
        return productRepository.save(existing);
    }
}
