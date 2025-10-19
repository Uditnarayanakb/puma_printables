package com.pumaprintables.platform.service;

import com.pumaprintables.platform.domain.model.Approval;
import com.pumaprintables.platform.domain.model.CourierInfo;
import com.pumaprintables.platform.domain.model.Order;
import com.pumaprintables.platform.domain.model.OrderItem;
import com.pumaprintables.platform.domain.model.Product;
import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.ApprovalStatus;
import com.pumaprintables.platform.domain.model.enums.OrderStatus;
import com.pumaprintables.platform.domain.repository.ApprovalRepository;
import com.pumaprintables.platform.domain.repository.CourierInfoRepository;
import com.pumaprintables.platform.domain.repository.OrderRepository;
import com.pumaprintables.platform.domain.repository.ProductRepository;
import com.pumaprintables.platform.domain.repository.UserRepository;
import com.pumaprintables.platform.service.exception.InvalidOrderStateException;
import com.pumaprintables.platform.service.exception.OrderNotFoundException;
import com.pumaprintables.platform.service.exception.ProductNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ApprovalRepository approvalRepository;
    private final CourierInfoRepository courierInfoRepository;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository,
                        UserRepository userRepository, ApprovalRepository approvalRepository,
                        CourierInfoRepository courierInfoRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.approvalRepository = approvalRepository;
        this.courierInfoRepository = courierInfoRepository;
    }

    @Transactional
    public Order createOrder(String username, String shippingAddress, String customerGst,
                             List<ItemPayload> items) {
        User user = getUserByUsername(username);

        if (items.isEmpty()) {
            throw new InvalidOrderStateException("Order must contain at least one item");
        }

        Order order = Order.builder()
            .user(user)
            .shippingAddress(shippingAddress)
            .customerGst(customerGst)
            .status(OrderStatus.PENDING_APPROVAL)
            .build();

        items.forEach(itemPayload -> {
            Product product = productRepository.findById(itemPayload.productId())
                .orElseThrow(() -> new ProductNotFoundException(itemPayload.productId().toString()));

            OrderItem orderItem = OrderItem.of(order, product, itemPayload.quantity(), product.getPrice());
            order.addItem(orderItem);
        });

        Order saved = orderRepository.save(order);
        hydrateOrder(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Order> getOrdersForUser(String username) {
        User user = getUserByUsername(username);
        List<Order> orders = orderRepository.findByUserId(user.getId());
        orders.forEach(this::hydrateOrder);
        return orders;
    }

    @Transactional(readOnly = true)
    public List<Order> getAllOrders() {
        List<Order> orders = orderRepository.findAll();
        orders.forEach(this::hydrateOrder);
        return orders;
    }

    @Transactional(readOnly = true)
    public List<Order> getOrdersByStatus(OrderStatus status) {
        List<Order> orders = orderRepository.findByStatus(status);
        orders.forEach(this::hydrateOrder);
        return orders;
    }

    @Transactional
    public Order approveOrder(UUID orderId, String approverUsername, String comments) {
        Order order = getOrder(orderId);

        if (order.getStatus() != OrderStatus.PENDING_APPROVAL) {
            throw new InvalidOrderStateException("Only pending orders can be approved");
        }

        User approver = getUserByUsername(approverUsername);

        order.setStatus(OrderStatus.APPROVED);
        Approval approval = order.getApproval();
        if (approval == null) {
            approval = new Approval();
            approval.setOrder(order);
        }
        approval.setApprover(approver);
        approval.setStatus(ApprovalStatus.APPROVED);
        approval.setComments(comments);
        approval.setApprovalDate(OffsetDateTime.now());
        order.setApproval(approval);

        approvalRepository.save(approval);
        Order saved = orderRepository.save(order);
        hydrateOrder(saved);
        return saved;
    }

    @Transactional
    public Order rejectOrder(UUID orderId, String approverUsername, String comments) {
        Order order = getOrder(orderId);

        if (order.getStatus() != OrderStatus.PENDING_APPROVAL) {
            throw new InvalidOrderStateException("Only pending orders can be rejected");
        }

        User approver = getUserByUsername(approverUsername);

        order.setStatus(OrderStatus.REJECTED);
        Approval approval = order.getApproval();
        if (approval == null) {
            approval = new Approval();
            approval.setOrder(order);
        }
        approval.setApprover(approver);
        approval.setStatus(ApprovalStatus.REJECTED);
        approval.setComments(comments);
        approval.setApprovalDate(OffsetDateTime.now());
        order.setApproval(approval);

        approvalRepository.save(approval);
        Order saved = orderRepository.save(order);
        hydrateOrder(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public Order getOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId.toString()));
        hydrateOrder(order);
        return order;
    }

    @Transactional
    public Order addCourierInfo(UUID orderId, String courierName, String trackingNumber, OffsetDateTime dispatchDate) {
        Order order = getOrder(orderId);

        if (order.getStatus() != OrderStatus.APPROVED && order.getStatus() != OrderStatus.IN_TRANSIT) {
            throw new InvalidOrderStateException("Courier details can only be added to approved orders");
        }

        CourierInfo courierInfo = order.getCourierInfo();
        if (courierInfo == null) {
            courierInfo = CourierInfo.builder()
                .order(order)
                .build();
        }

        courierInfo.setCourierName(courierName);
        courierInfo.setTrackingNumber(trackingNumber);
        courierInfo.setDispatchDate(dispatchDate);

        order.setCourierInfo(courierInfo);
        courierInfoRepository.save(courierInfo);

        if (order.getStatus() == OrderStatus.APPROVED) {
            order.setStatus(OrderStatus.IN_TRANSIT);
        }

        Order saved = orderRepository.save(order);
        hydrateOrder(saved);
        return saved;
    }

    private User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalStateException("User not found: " + username));
    }

    private void hydrateOrder(Order order) {
        order.getItems().forEach(item -> {
            item.getProduct().getName();
            item.getProduct().getPrice();
        });
        if (order.getApproval() != null) {
            order.getApproval().getStatus();
            order.getApproval().getApprover().getUsername();
        }
        if (order.getCourierInfo() != null) {
            order.getCourierInfo().getCourierName();
            order.getCourierInfo().getTrackingNumber();
            order.getCourierInfo().getDispatchDate();
        }
    }

    public record ItemPayload(UUID productId, int quantity) {

        public BigDecimal total(Product product) {
            return product.getPrice().multiply(BigDecimal.valueOf(quantity));
        }
    }
}
