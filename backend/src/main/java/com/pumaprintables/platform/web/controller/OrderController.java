package com.pumaprintables.platform.web.controller;

import com.pumaprintables.platform.domain.model.Order;
import com.pumaprintables.platform.domain.model.enums.OrderStatus;
import com.pumaprintables.platform.service.OrderService;
import com.pumaprintables.platform.web.dto.AcceptOrderRequest;
import com.pumaprintables.platform.web.dto.ApprovalActionRequest;
import com.pumaprintables.platform.web.dto.CourierInfoRequest;
import com.pumaprintables.platform.web.dto.CourierInfoResponse;
import com.pumaprintables.platform.web.dto.CreateOrderRequest;
import com.pumaprintables.platform.web.dto.OrderItemRequest;
import com.pumaprintables.platform.web.dto.OrderItemResponse;
import com.pumaprintables.platform.web.dto.OrderResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrders(Authentication authentication,
                                                         @RequestParam(value = "status", required = false) OrderStatus status) {
        boolean isPrivileged = hasAnyRole(authentication, Set.of("ROLE_ADMIN", "ROLE_APPROVER"));

        List<Order> orders;
        if (status != null && isPrivileged) {
            orders = orderService.getOrdersByStatus(status);
        } else if (isPrivileged) {
            orders = orderService.getAllOrders();
        } else {
            orders = orderService.getOrdersForUser(authentication.getName());
        }

        return ResponseEntity.ok(orders.stream().map(this::toResponse).toList());
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
        Order order = orderService.getOrder(orderId);
        return ResponseEntity.ok(toResponse(order));
    }

    @PreAuthorize("hasAnyRole('APPROVER','ADMIN')")
    @GetMapping("/pending")
    public ResponseEntity<List<OrderResponse>> getPendingOrders() {
        List<Order> orders = orderService.getOrdersByStatus(OrderStatus.PENDING_APPROVAL);
        return ResponseEntity.ok(orders.stream().map(this::toResponse).toList());
    }

    @PreAuthorize("hasAnyRole('STORE_USER','ADMIN')")
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(Authentication authentication,
                                                      @Valid @RequestBody CreateOrderRequest request) {
        List<OrderService.ItemPayload> items = request.items().stream()
            .map(this::toItemPayload)
            .toList();

        Order order = orderService.createOrder(authentication.getName(),
            request.shippingAddress(),
            request.customerGst(),
            items);

        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(order));
    }

    @PreAuthorize("hasAnyRole('APPROVER','ADMIN')")
    @PostMapping("/{orderId}/approve")
    public ResponseEntity<OrderResponse> approveOrder(Authentication authentication,
                                                       @PathVariable UUID orderId,
                                                       @Valid @RequestBody ApprovalActionRequest request) {
        Order order = orderService.approveOrder(orderId, authentication.getName(), request.comments());
        return ResponseEntity.ok(toResponse(order));
    }

    @PreAuthorize("hasAnyRole('FULFILLMENT_AGENT','ADMIN')")
    @PostMapping("/{orderId}/accept")
    public ResponseEntity<OrderResponse> acceptOrder(Authentication authentication,
                                                      @PathVariable UUID orderId,
                                                      @Valid @RequestBody AcceptOrderRequest request) {
        Order order = orderService.acceptOrder(orderId, authentication.getName(), request.deliveryAddress());
        return ResponseEntity.ok(toResponse(order));
    }

    @PreAuthorize("hasAnyRole('APPROVER','ADMIN')")
    @PostMapping("/{orderId}/reject")
    public ResponseEntity<OrderResponse> rejectOrder(Authentication authentication,
                                                      @PathVariable UUID orderId,
                                                      @Valid @RequestBody ApprovalActionRequest request) {
        Order order = orderService.rejectOrder(orderId, authentication.getName(), request.comments());
        return ResponseEntity.ok(toResponse(order));
    }

    @PreAuthorize("hasAnyRole('APPROVER','FULFILLMENT_AGENT','ADMIN')")
    @PostMapping("/{orderId}/courier")
    public ResponseEntity<OrderResponse> addCourierInfo(@PathVariable UUID orderId,
                                                        @Valid @RequestBody CourierInfoRequest request) {
        Order order = orderService.addCourierInfo(orderId,
            request.courierName(),
            request.trackingNumber(),
            request.dispatchDate());

        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(order));
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
            .map(item -> {
                BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                return new OrderItemResponse(
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getProduct().getImageUrl(),
                    item.getQuantity(),
                    item.getUnitPrice(),
                    lineTotal
                );
            })
            .toList();

        BigDecimal total = items.stream()
            .map(OrderItemResponse::lineTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        CourierInfoResponse courierInfo = null;
        if (order.getCourierInfo() != null) {
            courierInfo = new CourierInfoResponse(
                order.getCourierInfo().getCourierName(),
                order.getCourierInfo().getTrackingNumber(),
                order.getCourierInfo().getDispatchDate()
            );
        }

        return new OrderResponse(
            order.getId(),
            order.getStatus(),
            order.getShippingAddress(),
            order.getDeliveryAddress(),
            order.getCustomerGst(),
            items,
            total,
            order.getCreatedAt(),
            courierInfo
        );
    }

    private OrderService.ItemPayload toItemPayload(OrderItemRequest item) {
        return new OrderService.ItemPayload(item.productId(), item.quantity());
    }

    private boolean hasAnyRole(Authentication authentication, Set<String> roles) {
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (roles.contains(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
