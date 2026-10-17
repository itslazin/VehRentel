USE thrissur_vehicle_rental;

ALTER TABLE complaints
    MODIFY COLUMN customer_id BIGINT NULL;

ALTER TABLE complaints
    ADD COLUMN shop_id BIGINT NULL,
    ADD CONSTRAINT fk_complaints_shop
        FOREIGN KEY (shop_id) REFERENCES shops(shop_id);
