package com.pumaprintables.platform.web.controller;

import com.pumaprintables.platform.domain.model.Product;
import com.pumaprintables.platform.service.ProductService;
import com.pumaprintables.platform.web.dto.ProductRequest;
import com.pumaprintables.platform.web.dto.ProductResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getProducts() {
        List<ProductResponse> products = productService.getAllProducts().stream()
            .map(this::toResponse)
            .toList();
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable UUID id) {
        Product product = productService.getProduct(id);
        return ResponseEntity.ok(toResponse(product));
    }

    @PreAuthorize("hasAnyRole('STORE_USER','ADMIN')")
    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductRequest request) {
        Product product = productService.createProduct(
            request.sku(),
            request.name(),
            request.description(),
            request.price(),
            request.specifications(),
            request.stockQuantity(),
            request.active()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(product));
    }

    @PreAuthorize("hasAnyRole('STORE_USER','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(@PathVariable UUID id,
                                                          @Valid @RequestBody ProductRequest request) {
        Product product = productService.updateProduct(
            id,
            request.sku(),
            request.name(),
            request.description(),
            request.price(),
            request.specifications(),
            request.stockQuantity(),
            request.active()
        );
        return ResponseEntity.ok(toResponse(product));
    }

    @PreAuthorize("hasAnyRole('STORE_USER','ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ProductResponse> deactivateProduct(@PathVariable UUID id) {
        Product product = productService.deactivateProduct(id);
        return ResponseEntity.ok(toResponse(product));
    }

    private ProductResponse toResponse(Product product) {
        return new ProductResponse(
            product.getId(),
            product.getSku(),
            product.getName(),
            product.getDescription(),
            product.getPrice(),
            product.getSpecifications(),
            product.getStockQuantity(),
            product.getActive(),
            product.getCreatedAt()
        );
    }
}
