package com.pumaprintables.platform.service;

import com.pumaprintables.platform.domain.model.NotificationLog;
import com.pumaprintables.platform.domain.model.Order;
import com.pumaprintables.platform.domain.model.OrderItem;
import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.NotificationLogRepository;
import com.pumaprintables.platform.domain.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm xxx", Locale.ENGLISH);

    private final JavaMailSender mailSender;
    private final NotificationProperties properties;
    private final UserRepository userRepository;
    private final NotificationLogRepository notificationLogRepository;

    public NotificationService(JavaMailSender mailSender,
                               NotificationProperties properties,
                               UserRepository userRepository,
                               NotificationLogRepository notificationLogRepository) {
        this.mailSender = mailSender;
        this.properties = properties;
        this.userRepository = userRepository;
        this.notificationLogRepository = notificationLogRepository;
    }

    public void notifyOrderCreated(Order order) {
        List<String> recipients = new ArrayList<>();
        addIfPresent(recipients, order.getUser());

        if (properties.isCopyApproversOnCreation()) {
            userRepository.findByRole(UserRole.APPROVER).stream()
                .map(User::getEmail)
                .filter(email -> email != null && !email.isBlank())
                .forEach(recipients::add);
        }

        String subject = "Order " + order.getId() + " is pending approval";
        String body = buildOrderSummary("A new order has been placed and awaits approval.", order);
        dispatch(recipients, subject, body);
    }

    public void notifyOrderApproved(Order order) {
        sendToUser(order.getUser(),
            "Order " + order.getId() + " approved",
            buildOrderSummary("Good news! Your order has been approved.", order));
    }

    public void notifyOrderRejected(Order order) {
        sendToUser(order.getUser(),
            "Order " + order.getId() + " rejected",
            buildOrderSummary("Unfortunately the order was rejected.", order));
    }

    public void notifyCourierUpdated(Order order) {
        sendToUser(order.getUser(),
            "Order " + order.getId() + " dispatched",
            buildOrderSummary("Your order is on the move. Courier details are included below.", order));
    }

    private void sendToUser(User user, String subject, String body) {
        List<String> recipients = new ArrayList<>();
        addIfPresent(recipients, user);
        dispatch(recipients, subject, body);
    }

    private void addIfPresent(List<String> recipients, User user) {
        Optional.ofNullable(user)
            .map(User::getEmail)
            .filter(email -> !email.isBlank())
            .ifPresent(recipients::add);
    }

    private void dispatch(List<String> recipients, String subject, String body) {
        if (recipients.isEmpty()) {
            log.debug("Skipping email '{}' because no recipients were resolved", subject);
            return;
        }

        NotificationLog logEntry = NotificationLog.builder()
            .subject(subject)
            .recipients(String.join(", ", recipients))
            .body(body)
            .build();
        notificationLogRepository.save(logEntry);

        if (!properties.isEnabled()) {
            log.debug("Email notifications disabled. Captured log entry for '{}'", subject);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(properties.getFromAddress());
            message.setTo(recipients.toArray(String[]::new));
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (MailException ex) {
            log.warn("Unable to send notification email '{}': {}", subject, ex.getMessage());
            log.debug("Email failure", ex);
        }
    }

    private String buildOrderSummary(String intro, Order order) {
        StringBuilder builder = new StringBuilder(intro)
            .append("\n\nOrder ID: ").append(order.getId())
            .append("\nStatus: ").append(order.getStatus());

        if (order.getApproval() != null && order.getApproval().getApprover() != null) {
            builder.append("\nApprover: ").append(order.getApproval().getApprover().getUsername());
        }

        builder.append("\nPlaced By: ").append(Optional.ofNullable(order.getUser()).map(User::getUsername).orElse("Unknown"))
            .append("\nShipping Address: ").append(Optional.ofNullable(order.getShippingAddress()).orElse("Not provided"));

        if (order.getCourierInfo() != null) {
            builder.append("\nCourier: ").append(order.getCourierInfo().getCourierName())
                .append("\nTracking #: ").append(order.getCourierInfo().getTrackingNumber());
            if (order.getCourierInfo().getDispatchDate() != null) {
                builder.append("\nDispatch Date: ").append(DATE_FORMATTER.format(order.getCourierInfo().getDispatchDate()));
            }
        }

        builder.append("\n\nItems:\n")
            .append(order.getItems().stream()
                .map(this::formatItem)
                .collect(Collectors.joining("\n")));

        builder.append("\n\nTotal: ").append(calculateTotal(order));

        if (order.getApproval() != null && order.getApproval().getComments() != null && !order.getApproval().getComments().isBlank()) {
            builder.append("\nApprover Comments: ").append(order.getApproval().getComments());
        }

        return builder.toString();
    }

    private String formatItem(OrderItem item) {
        BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return "- " + item.getProduct().getName() + " x" + item.getQuantity() + " @ " + item.getUnitPrice() + " = " + lineTotal;
    }

    private BigDecimal calculateTotal(Order order) {
        return order.getItems().stream()
            .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
