package com.pumaprintables.platform.domain.model;

import com.pumaprintables.platform.domain.model.id.OrderItemId;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
@Entity
@Table(name = "order_items")
public class OrderItem {

    @EmbeddedId
    @EqualsAndHashCode.Include
    private OrderItemId id;

    @MapsId("orderId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    @ToString.Exclude
    private Order order;

    @MapsId("productId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    @ToString.Exclude
    private Product product;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    public static OrderItem of(Order order, Product product, Integer quantity, BigDecimal unitPrice) {
        OrderItem item = OrderItem.builder()
            .id(new OrderItemId())
            .order(order)
            .product(product)
            .quantity(quantity)
            .unitPrice(unitPrice)
            .build();
        return item;
    }

    public void setOrder(Order order) {
        this.order = order;
        if (order != null) {
            ensureId().setOrderId(order.getId());
        }
    }

    public void setProduct(Product product) {
        this.product = product;
        if (product != null) {
            ensureId().setProductId(product.getId());
        }
    }

    private OrderItemId ensureId() {
        if (this.id == null) {
            this.id = new OrderItemId();
        }
        return this.id;
    }
}
