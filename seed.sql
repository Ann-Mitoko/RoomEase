USE roomease_db;

INSERT INTO users (full_name,email,phone,password_hash,role) VALUES
 ('Hostel Admin','admin@roomease.co.ke','0700000001','$2y$10$.CVZoB4h0B/kEm..IVTkKe5oWo1uhfTqQmDvawUWyRFBE.lMsrR4i','admin'),
 ('Test Student','student@roomease.co.ke','0711111111','$2y$10$6rlUw5OiKWF9X8tdnY7Y7OCKSyaiKr6LKppy0928virHyqZeZtrV2','student'),
 ('Amina Otieno','amina@student.ac.ke','0722222222','$2y$10$6rlUw5OiKWF9X8tdnY7Y7OCKSyaiKr6LKppy0928virHyqZeZtrV2','student');

INSERT INTO room_types (type_name,description) VALUES
 ('Single','One bed, private'),
 ('Double','Two beds, shared'),
 ('Bedsitter','Self-contained with kitchenette');

INSERT INTO rooms (room_number,type_id,price_per_night,capacity,description,status) VALUES
 ('A101',1,800,1,'Ground floor, near the gate','active'),
 ('A102',1,850,1,'Quiet side of the block','active'),
 ('B201',2,1200,2,'Second floor with balcony','active'),
 ('B202',2,1200,2,'Second floor','maintenance'),
 ('C301',3,2000,1,'Top floor bedsitter','active'),
 ('C302',3,2100,2,'Top floor bedsitter, bigger','active');

INSERT INTO bookings (user_id,room_id,check_in,check_out,total_amount,status,approved_by) VALUES
 (2,1,'2026-11-01','2026-11-08',5600,'approved',1),
 (3,3,'2026-11-03','2026-11-10',8400,'pending',NULL),
 (2,5,'2026-11-15','2026-11-18',6000,'pending',NULL);

INSERT INTO payments (booking_id,phone_number,amount,mpesa_receipt_no,status,paid_at) VALUES
 (1,'0711111111',5600,'SJK1234ABC','success','2026-10-25 10:00:00'),
 (2,'0722222222',8400,NULL,'pending',NULL);