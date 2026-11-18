CREATE DATABASE IF NOT EXISTS roomease_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE roomease_db;

-- Drop in reverse order so you can re-run this file safely
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS room_types;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE,
  phone         VARCHAR(15)  UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('student','admin') NOT NULL DEFAULT 'student',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_users_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE room_types (
  type_id     INT AUTO_INCREMENT PRIMARY KEY,
  type_name   VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE rooms (
  room_id         INT AUTO_INCREMENT PRIMARY KEY,
  room_number     VARCHAR(10) NOT NULL UNIQUE,
  type_id         INT NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  capacity        TINYINT NOT NULL,
  description     TEXT,
  status          ENUM('active','maintenance') NOT NULL DEFAULT 'active',
  CONSTRAINT fk_rooms_type FOREIGN KEY (type_id) REFERENCES room_types(type_id),
  CONSTRAINT chk_rooms_price CHECK (price_per_night > 0),
  CONSTRAINT chk_rooms_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE TABLE bookings (
  booking_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  room_id      INT NOT NULL,
  check_in     DATE NOT NULL,
  check_out    DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status       ENUM('pending','approved','cancelled') NOT NULL DEFAULT 'pending',
  approved_by  INT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_user  FOREIGN KEY (user_id)     REFERENCES users(user_id),
  CONSTRAINT fk_bookings_room  FOREIGN KEY (room_id)     REFERENCES rooms(room_id),
  CONSTRAINT fk_bookings_admin FOREIGN KEY (approved_by) REFERENCES users(user_id),
  CONSTRAINT chk_bookings_dates CHECK (check_out > check_in)
) ENGINE=InnoDB;

CREATE TABLE payments (
  payment_id       INT AUTO_INCREMENT PRIMARY KEY,
  booking_id       INT NOT NULL,
  phone_number     VARCHAR(15) NOT NULL,
  amount           DECIMAL(10,2) NOT NULL,
  mpesa_receipt_no VARCHAR(20) UNIQUE,
  status           ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
  paid_at          DATETIME NULL,
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  log_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NULL,
  action    VARCHAR(100) NOT NULL,
  entity    VARCHAR(50),
  entity_id INT,
  logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Speeds up room availability checks and booking filters
CREATE INDEX idx_bookings_room_dates ON bookings(room_id, check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);