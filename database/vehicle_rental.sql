CREATE DATABASE IF NOT EXISTS thrissur_vehicle_rental;
USE thrissur_vehicle_rental;

CREATE TABLE IF NOT EXISTS admin (
  admin_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'PLATFORM_ADMIN'
);

CREATE TABLE IF NOT EXISTS shops (
  shop_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  shop_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  area VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  business_license_no VARCHAR(255) NOT NULL,
  owner_id_proof_no VARCHAR(255) NOT NULL,
  registration_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  suspension_reason TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE,
  address TEXT NOT NULL,
  driving_license_no VARCHAR(255),
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  shop_id BIGINT NOT NULL,
  vehicle_name VARCHAR(255) NOT NULL,
  brand VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  rent_per_day DOUBLE NOT NULL,
  vehicle_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  image_path VARCHAR(500),
  engine_cc INT,
  seats INT,
  fuel_type VARCHAR(50),
  transmission_type VARCHAR(50),
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id)
);

CREATE TABLE IF NOT EXISTS rentals (
  rental_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  vehicle_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  start_date DATE NOT NULL,
  expected_return_date DATE NOT NULL,
  actual_return_date DATE,
  rental_days INT,
  rent_per_day DOUBLE,
  estimated_amount DOUBLE,
  late_days INT,
  late_charge DOUBLE,
  final_amount DOUBLE,
  return_marked_by VARCHAR(30),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id)
);

CREATE TABLE IF NOT EXISTS complaints (
  complaint_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT,
  shop_id BIGINT,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  admin_response TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id)
);

INSERT INTO admin (email, password, role)
VALUES (
  'admin@gmail.com',
  '$2a$10$5bLP0D6tWxE/Ef5XY2GyFurXgq2jQmR2b5dWcn4h1B3k4mC0wA5Nq',
  'PLATFORM_ADMIN'
)
ON DUPLICATE KEY UPDATE
password = VALUES(password),
role = VALUES(role);