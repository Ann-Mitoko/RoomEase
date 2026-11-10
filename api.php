<?php
// JSON API for room browsing, room management, bookings, and demo payments.
header('Content-Type: application/json; charset=utf-8');

function addUiFields(array $room): array {
    // The card UI has fields that are not present in the SQL schema yet.
    return $room + [
        'amenities' => [],
        'images' => [],
        'rating' => 0,
        'reviews_count' => 0,
        'guest_favorite' => false,
    ];
}

function bookingWithDetails(PDO $pdo, int $id): ?array {
    $stmt = $pdo->prepare('SELECT booking_id, user_id, room_id, check_in, check_out, total_amount, status, approved_by, created_at FROM bookings WHERE booking_id=:id');
    $stmt->execute(['id' => $id]);
    $booking = $stmt->fetch();
    if (!$booking) return null;

    $stmt = $pdo->prepare('SELECT user_id, full_name, email, phone, role, created_at FROM users WHERE user_id=:id');
    $stmt->execute(['id' => $booking['user_id']]);
    $booking['student'] = $stmt->fetch();

    $stmt = $pdo->prepare('SELECT r.room_id, r.room_number, r.type_id, t.type_name, r.price_per_night, r.capacity, r.description, r.status FROM rooms r JOIN room_types t ON t.type_id=r.type_id WHERE r.room_id=:id');
    $stmt->execute(['id' => $booking['room_id']]);
    $room = $stmt->fetch();
    $booking['room'] = $room ? addUiFields($room) : null;

    $stmt = $pdo->prepare('SELECT payment_id, booking_id, phone_number, amount, mpesa_receipt_no, status, paid_at FROM payments WHERE booking_id=:id ORDER BY payment_id DESC LIMIT 1');
    $stmt->execute(['id' => $id]);
    $booking['payment'] = $stmt->fetch() ?: null;
    return $booking;
}

try {
    require_once __DIR__ . '/dp.php';
    $pdo = db();
    $resource = $_GET['resource'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($resource === 'room-types') {
        $rows = $pdo->query('SELECT type_id, type_name, description FROM room_types ORDER BY type_id')->fetchAll();
        echo json_encode($rows);
        exit;
    }

    if ($resource === 'rooms') {
        $sql = "SELECT r.room_id, r.room_number, r.type_id, t.type_name,
                       r.price_per_night, r.capacity, r.description, r.status
                FROM rooms r JOIN room_types t ON t.type_id = r.type_id
                WHERE r.status = 'active'";
        $params = [];
        if (isset($_GET['type_id']) && $_GET['type_id'] !== '') {
            $sql .= ' AND r.type_id = :type_id';
            $params['type_id'] = (int) $_GET['type_id'];
        }
        if (isset($_GET['max_price']) && $_GET['max_price'] !== '') {
            $sql .= ' AND r.price_per_night <= :max_price';
            $params['max_price'] = (float) $_GET['max_price'];
        }
        if (!empty($_GET['check_in']) && !empty($_GET['check_out'])) {
            $sql .= " AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = r.room_id AND b.status IN ('pending','approved')
                  AND b.check_in < :check_out AND b.check_out > :check_in
            )";
            $params['check_in'] = $_GET['check_in'];
            $params['check_out'] = $_GET['check_out'];
        }
        $sql .= ' ORDER BY r.room_id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rooms = array_map('addUiFields', $stmt->fetchAll());
        echo json_encode($rooms);
        exit;
    }

    if ($resource === 'room') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'A valid room id is required.']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT r.room_id, r.room_number, r.type_id, t.type_name,
                                      r.price_per_night, r.capacity, r.description, r.status
                               FROM rooms r JOIN room_types t ON t.type_id = r.type_id
                               WHERE r.room_id = :id");
        $stmt->execute(['id' => $id]);
        $room = $stmt->fetch();
        if (!$room) {
            http_response_code(404);
            echo json_encode(['message' => 'Room not found.']);
            exit;
        }
        $room = addUiFields($room);
        $stmt = $pdo->prepare("SELECT check_in, check_out FROM bookings
                               WHERE room_id = :id AND status IN ('pending','approved')");
        $stmt->execute(['id' => $id]);
        $room['booked'] = $stmt->fetchAll();
        echo json_encode($room);
        exit;
    }

    if ($resource === 'admin-rooms') {
        if ($method === 'GET') {
            $rows = $pdo->query("SELECT r.room_id, r.room_number, r.type_id, t.type_name,
                                        r.price_per_night, r.capacity, r.description, r.status
                                 FROM rooms r JOIN room_types t ON t.type_id = r.type_id
                                 ORDER BY r.room_id DESC")->fetchAll();
            echo json_encode(array_map('addUiFields', $rows));
            exit;
        }

        if ($method === 'POST' || $method === 'PUT') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $id = isset($input['room_id']) ? (int) $input['room_id'] : 0;
            $roomNumber = trim($input['room_number'] ?? '');
            $typeId = (int) ($input['type_id'] ?? 0);
            $price = (float) ($input['price_per_night'] ?? 0);
            $capacity = (int) ($input['capacity'] ?? 0);
            $description = trim($input['description'] ?? '');
            $status = $input['status'] ?? 'active';

            if ($roomNumber === '' || strlen($roomNumber) > 10 || $typeId < 1 || $price <= 0 || $capacity < 1 || !in_array($status, ['active', 'maintenance'], true)) {
                http_response_code(400);
                echo json_encode(['message' => 'Enter a room number, valid type, positive price and capacity, and valid status.']);
                exit;
            }
            $typeCheck = $pdo->prepare('SELECT COUNT(*) FROM room_types WHERE type_id = :type_id');
            $typeCheck->execute(['type_id' => $typeId]);
            if (!$typeCheck->fetchColumn()) {
                http_response_code(400);
                echo json_encode(['message' => 'Choose a valid room type.']);
                exit;
            }

            try {
                if ($method === 'PUT') {
                    if ($id < 1) {
                        http_response_code(400);
                        echo json_encode(['message' => 'A valid room id is required.']);
                        exit;
                    }
                    $stmt = $pdo->prepare('UPDATE rooms SET room_number=:number, type_id=:type_id, price_per_night=:price, capacity=:capacity, description=:description, status=:status WHERE room_id=:id');
                    $stmt->execute(['number' => $roomNumber, 'type_id' => $typeId, 'price' => $price, 'capacity' => $capacity, 'description' => $description, 'status' => $status, 'id' => $id]);
                    if (!$stmt->rowCount() && !$pdo->query('SELECT 1 FROM rooms WHERE room_id=' . $id)->fetchColumn()) {
                        http_response_code(404);
                        echo json_encode(['message' => 'Room not found.']);
                        exit;
                    }
                } else {
                    $stmt = $pdo->prepare('INSERT INTO rooms (room_number, type_id, price_per_night, capacity, description, status) VALUES (:number, :type_id, :price, :capacity, :description, :status)');
                    $stmt->execute(['number' => $roomNumber, 'type_id' => $typeId, 'price' => $price, 'capacity' => $capacity, 'description' => $description, 'status' => $status]);
                    $id = (int) $pdo->lastInsertId();
                }
            } catch (PDOException $e) {
                if (($e->errorInfo[1] ?? null) === 1062) {
                    http_response_code(409);
                    echo json_encode(['message' => 'That room number already exists.']);
                    exit;
                }
                throw $e;
            }

            $stmt = $pdo->prepare('SELECT r.room_id, r.room_number, r.type_id, t.type_name, r.price_per_night, r.capacity, r.description, r.status FROM rooms r JOIN room_types t ON t.type_id=r.type_id WHERE r.room_id=:id');
            $stmt->execute(['id' => $id]);
            echo json_encode(addUiFields($stmt->fetch()));
            exit;
        }

        if ($method === 'DELETE') {
            $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['message' => 'A valid room id is required.']);
                exit;
            }
            $check = $pdo->prepare('SELECT COUNT(*) FROM bookings WHERE room_id=:id');
            $check->execute(['id' => $id]);
            if ((int) $check->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['message' => 'This room has booking history and cannot be deleted. Set it to maintenance instead.']);
                exit;
            }
            $stmt = $pdo->prepare('DELETE FROM rooms WHERE room_id=:id');
            $stmt->execute(['id' => $id]);
            echo json_encode(['ok' => true]);
            exit;
        }
    }

    if ($resource === 'bookings' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = (int) ($input['user_id'] ?? 0);
        $roomId = (int) ($input['room_id'] ?? 0);
        $checkIn = $input['check_in'] ?? '';
        $checkOut = $input['check_out'] ?? '';
        $inDate = DateTime::createFromFormat('!Y-m-d', $checkIn);
        $outDate = DateTime::createFromFormat('!Y-m-d', $checkOut);
        if (!$inDate || !$outDate || $outDate <= $inDate || $checkIn < date('Y-m-d')) {
            http_response_code(400);
            echo json_encode(['message' => 'Choose valid dates, with check-out after check-in and check-in today or later.']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT room_id, price_per_night FROM rooms WHERE room_id=:id AND status='active'");
        $stmt->execute(['id' => $roomId]);
        $room = $stmt->fetch();
        if (!$room) {
            http_response_code(404);
            echo json_encode(['message' => 'This room is not available for booking.']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE user_id=:id AND role='student'");
        $stmt->execute(['id' => $userId]);
        if (!$stmt->fetchColumn()) {
            http_response_code(400);
            echo json_encode(['message' => 'The signed-in demo user is not present in the database. Use the seeded student account.']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE room_id=:room_id AND status IN ('pending','approved') AND check_in < :check_out AND check_out > :check_in");
        $stmt->execute(['room_id' => $roomId, 'check_in' => $checkIn, 'check_out' => $checkOut]);
        if ((int) $stmt->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(['message' => 'Sorry, those dates are already booked. Choose other dates.']);
            exit;
        }
        $nights = (int) $inDate->diff($outDate)->days;
        $amount = $nights * (float) $room['price_per_night'];
        $stmt = $pdo->prepare("INSERT INTO bookings (user_id, room_id, check_in, check_out, total_amount, status) VALUES (:user_id, :room_id, :check_in, :check_out, :amount, 'pending')");
        $stmt->execute(['user_id' => $userId, 'room_id' => $roomId, 'check_in' => $checkIn, 'check_out' => $checkOut, 'amount' => $amount]);
        echo json_encode(bookingWithDetails($pdo, (int) $pdo->lastInsertId()));
        exit;
    }

    if ($resource === 'booking' && $method === 'GET') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $userId = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
        $role = $_GET['role'] ?? '';
        $booking = $id ? bookingWithDetails($pdo, $id) : null;
        if (!$booking || ($role !== 'admin' && (int) $booking['user_id'] !== (int) $userId)) {
            http_response_code(404);
            echo json_encode(['message' => 'Booking not found.']);
            exit;
        }
        echo json_encode($booking);
        exit;
    }

    if ($resource === 'my-bookings' && $method === 'GET') {
        $userId = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
        $stmt = $pdo->prepare('SELECT booking_id FROM bookings WHERE user_id=:user_id ORDER BY booking_id DESC');
        $stmt->execute(['user_id' => $userId ?: 0]);
        $rows = [];
        foreach ($stmt->fetchAll() as $item) $rows[] = bookingWithDetails($pdo, (int) $item['booking_id']);
        echo json_encode($rows);
        exit;
    }

    if ($resource === 'my-booking' && $method === 'PATCH') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $userId = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
        $stmt = $pdo->prepare("UPDATE bookings SET status='cancelled' WHERE booking_id=:id AND user_id=:user_id AND status='pending'");
        $stmt->execute(['id' => $id ?: 0, 'user_id' => $userId ?: 0]);
        if (!$stmt->rowCount()) {
            http_response_code(409);
            echo json_encode(['message' => 'Only your pending bookings can be cancelled.']);
            exit;
        }
        echo json_encode(bookingWithDetails($pdo, (int) $id));
        exit;
    }

    if ($resource === 'admin-bookings' && $method === 'GET') {
        $status = $_GET['status'] ?? '';
        $sql = 'SELECT booking_id FROM bookings';
        $params = [];
        if ($status !== '') { $sql .= ' WHERE status=:status'; $params['status'] = $status; }
        $sql .= ' ORDER BY booking_id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = [];
        foreach ($stmt->fetchAll() as $item) $rows[] = bookingWithDetails($pdo, (int) $item['booking_id']);
        echo json_encode($rows);
        exit;
    }

    if ($resource === 'admin-booking' && $method === 'PATCH') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = $input['status'] ?? '';
        $adminId = (int) ($input['admin_id'] ?? 0);
        if (!in_array($status, ['approved', 'cancelled'], true)) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid booking status.']);
            exit;
        }
        $check = $pdo->prepare("SELECT COUNT(*) FROM users WHERE user_id=:id AND role='admin'");
        $check->execute(['id' => $adminId]);
        if (!$check->fetchColumn()) {
            http_response_code(403);
            echo json_encode(['message' => 'Admin account not found in the database.']);
            exit;
        }
        $stmt = $pdo->prepare('UPDATE bookings SET status=:status, approved_by=:admin_id WHERE booking_id=:id');
        $stmt->execute(['status' => $status, 'admin_id' => $status === 'approved' ? $adminId : null, 'id' => $id ?: 0]);
        if (!$stmt->rowCount()) {
            http_response_code(404);
            echo json_encode(['message' => 'Booking not found or unchanged.']);
            exit;
        }
        echo json_encode(bookingWithDetails($pdo, (int) $id));
        exit;
    }

    if ($resource === 'payment' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $bookingId = (int) ($input['booking_id'] ?? 0);
        $phone = trim($input['phone_number'] ?? '');
        $stmt = $pdo->prepare('SELECT total_amount FROM bookings WHERE booking_id=:id');
        $stmt->execute(['id' => $bookingId]);
        $booking = $stmt->fetch();
        if (!$booking || $phone === '') {
            http_response_code(400);
            echo json_encode(['message' => 'Booking and phone number are required.']);
            exit;
        }
        $stmt = $pdo->prepare("INSERT INTO payments (booking_id, phone_number, amount, status) VALUES (:booking_id, :phone, :amount, 'pending')");
        $stmt->execute(['booking_id' => $bookingId, 'phone' => $phone, 'amount' => $booking['total_amount']]);
        $paymentId = (int) $pdo->lastInsertId();
        echo json_encode(['payment_id' => $paymentId, 'booking_id' => $bookingId, 'phone_number' => $phone, 'amount' => $booking['total_amount'], 'mpesa_receipt_no' => null, 'status' => 'pending', 'paid_at' => null]);
        exit;
    }

    if ($resource === 'payment' && $method === 'PATCH') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = ($input['outcome'] ?? '') === 'success' ? 'success' : 'failed';
        $receipt = $status === 'success' ? 'DEMO' . strtoupper(bin2hex(random_bytes(4))) : null;
        $stmt = $pdo->prepare('UPDATE payments SET status=:status, mpesa_receipt_no=:receipt, paid_at=:paid_at WHERE payment_id=:id');
        $stmt->execute(['status' => $status, 'receipt' => $receipt, 'paid_at' => $status === 'success' ? date('Y-m-d H:i:s') : null, 'id' => $id ?: 0]);
        $stmt = $pdo->prepare('SELECT payment_id, booking_id, phone_number, amount, mpesa_receipt_no, status, paid_at FROM payments WHERE payment_id=:id');
        $stmt->execute(['id' => $id ?: 0]);
        $payment = $stmt->fetch();
        if (!$payment) { http_response_code(404); echo json_encode(['message' => 'Payment not found.']); exit; }
        echo json_encode($payment);
        exit;
    }

    http_response_code(404);
    echo json_encode(['message' => 'Unknown API resource.']);
} catch (Throwable $e) {
    error_log('RoomEase API: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['message' => 'Database API error. Check the MySQL connection and imported schema.']);
}
