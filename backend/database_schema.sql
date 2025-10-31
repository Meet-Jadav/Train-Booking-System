-- =====================================================
-- Train Booking System - Complete MySQL Database Schema
-- with Triggers, Procedures, Functions, Cursors
-- =====================================================

DROP DATABASE IF EXISTS dbms_proj;
CREATE DATABASE dbms_proj;
USE dbms_proj;

-- =====================================================
-- TABLE DEFINITIONS
-- =====================================================

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(15),
    user_type VARCHAR(10) DEFAULT 'user',
    loyalty_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB;

CREATE TABLE railways (
    railway_id INT PRIMARY KEY AUTO_INCREMENT,
    railway_name VARCHAR(100) NOT NULL,
    railway_code VARCHAR(5) UNIQUE NOT NULL,
    contact_number VARCHAR(15),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE trains (
    train_id INT PRIMARY KEY AUTO_INCREMENT,
    train_number VARCHAR(10) UNIQUE NOT NULL,
    railway_id INT,
    source_city VARCHAR(50) NOT NULL,
    destination_city VARCHAR(50) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    total_seats INT NOT NULL,
    available_seats INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    train_status VARCHAR(20) DEFAULT 'scheduled',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (railway_id) REFERENCES railways(railway_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_source (source_city),
    INDEX idx_destination (destination_city),
    INDEX idx_departure (departure_time)
) ENGINE=InnoDB;

CREATE TABLE bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    train_id INT NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    passengers_count INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    booking_status VARCHAR(20) DEFAULT 'confirmed',
    payment_status VARCHAR(20) DEFAULT 'pending',
    pnr_number VARCHAR(10) UNIQUE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (train_id) REFERENCES trains(train_id),
    INDEX idx_user (user_id),
    INDEX idx_train (train_id),
    INDEX idx_pnr (pnr_number)
) ENGINE=InnoDB;

CREATE TABLE payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT UNIQUE NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(100) UNIQUE,
    payment_status VARCHAR(20) DEFAULT 'pending',
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB;

-- Audit table for trigger
CREATE TABLE booking_audit (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Revenue summary table for trigger
CREATE TABLE revenue_summary (
    summary_id INT PRIMARY KEY AUTO_INCREMENT,
    train_id INT NOT NULL,
    total_bookings INT DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (train_id) REFERENCES trains(train_id),
    UNIQUE KEY unique_train (train_id)
) ENGINE=InnoDB;

-- =====================================================
-- TRIGGER 1: Audit Booking Changes
-- =====================================================
DELIMITER $$

CREATE TRIGGER audit_booking_changes
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF OLD.booking_status != NEW.booking_status THEN
        INSERT INTO booking_audit (
            booking_id, 
            action_type, 
            old_status, 
            new_status, 
            changed_by
        ) VALUES (
            NEW.booking_id,
            'STATUS_CHANGE',
            OLD.booking_status,
            NEW.booking_status,
            NEW.user_id
        );
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- TRIGGER 2: Update Revenue Summary
-- =====================================================
DELIMITER $$

CREATE TRIGGER update_revenue_summary
AFTER INSERT ON bookings
FOR EACH ROW
BEGIN
    INSERT INTO revenue_summary (train_id, total_bookings, total_revenue)
    VALUES (NEW.train_id, 1, NEW.total_amount)
    ON DUPLICATE KEY UPDATE
        total_bookings = total_bookings + 1,
        total_revenue = total_revenue + NEW.total_amount;
END$$

DELIMITER ;

-- =====================================================
-- TRIGGER 3: Prevent Overbooking
-- =====================================================
DELIMITER $$

CREATE TRIGGER prevent_overbooking
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE seats_available INT;
    
    SELECT available_seats INTO seats_available
    FROM trains
    WHERE train_id = NEW.train_id;
    
    IF seats_available < NEW.passengers_count THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Not enough seats available for this booking';
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- FUNCTION 1: Calculate Loyalty Points
-- =====================================================
DELIMITER $$

CREATE FUNCTION CalculateLoyaltyPoints(booking_amount DECIMAL(10,2))
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE points INT;
    -- 1 point per 100 rupees spent
    SET points = FLOOR(booking_amount / 100);
    RETURN points;
END$$

DELIMITER ;

-- =====================================================
-- FUNCTION 2: Check Seat Availability
-- =====================================================
DELIMITER $$

CREATE FUNCTION CheckSeatAvailability(p_train_id INT)
RETURNS VARCHAR(20)
READS SQL DATA
BEGIN
    DECLARE seats INT;
    DECLARE total INT;
    DECLARE status VARCHAR(20);
    
    SELECT available_seats, total_seats INTO seats, total
    FROM trains
    WHERE train_id = p_train_id;
    
    IF seats = 0 THEN
        SET status = 'SOLD_OUT';
    ELSEIF seats < (total * 0.2) THEN
        SET status = 'LIMITED';
    ELSE
        SET status = 'AVAILABLE';
    END IF;
    
    RETURN status;
END$$

DELIMITER ;

-- =====================================================
-- FUNCTION 3: Calculate Travel Duration (in hours)
-- =====================================================
DELIMITER $$

CREATE FUNCTION CalculateTravelDuration(p_train_id INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
BEGIN
    DECLARE duration DECIMAL(5,2);
    
    SELECT TIMESTAMPDIFF(MINUTE, departure_time, arrival_time) / 60
    INTO duration
    FROM trains
    WHERE train_id = p_train_id;
    
    RETURN duration;
END$$

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 1: Book Train Tickets
-- =====================================================
DELIMITER $$

CREATE PROCEDURE BookTrainTickets(
    IN p_user_id INT,
    IN p_train_id INT,
    IN p_passengers_count INT,
    IN p_payment_method VARCHAR(20),
    OUT out_booking_id INT,
    OUT out_pnr_number VARCHAR(10),
    OUT out_total_amount DECIMAL(10,2),
    OUT out_message VARCHAR(255)
)
BEGIN
    DECLARE v_available_seats INT;
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_pnr VARCHAR(10);
    DECLARE v_loyalty_points INT;
    
    -- Exception handling
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET out_booking_id = -1;
        SET out_message = 'Booking failed due to database error';
    END;
    
    START TRANSACTION;
    
    -- Check seat availability
    SELECT available_seats, price INTO v_available_seats, v_price
    FROM trains
    WHERE train_id = p_train_id
    FOR UPDATE;
    
    IF v_available_seats < p_passengers_count THEN
        SET out_booking_id = -1;
        SET out_message = 'Not enough seats available';
        ROLLBACK;
    ELSE
        -- Calculate total amount
        SET out_total_amount = v_price * p_passengers_count;
        
        -- Generate PNR
        SET v_pnr = CONCAT('PNR', LPAD(FLOOR(RAND() * 999999), 6, '0'));
        
        -- Create booking
        INSERT INTO bookings (
            user_id, 
            train_id, 
            passengers_count, 
            total_amount, 
            pnr_number,
            booking_status,
            payment_status
        ) VALUES (
            p_user_id,
            p_train_id,
            p_passengers_count,
            out_total_amount,
            v_pnr,
            'confirmed',
            'completed'
        );
        
        SET out_booking_id = LAST_INSERT_ID();
        SET out_pnr_number = v_pnr;
        
        -- Update available seats
        UPDATE trains
        SET available_seats = available_seats - p_passengers_count
        WHERE train_id = p_train_id;
        
        -- Create payment record
        INSERT INTO payments (
            booking_id,
            payment_amount,
            payment_method,
            transaction_id,
            payment_status
        ) VALUES (
            out_booking_id,
            out_total_amount,
            p_payment_method,
            CONCAT('TXN', UPPER(SUBSTRING(MD5(RAND()), 1, 16))),
            'completed'
        );
        
        -- Calculate and update loyalty points
        SET v_loyalty_points = CalculateLoyaltyPoints(out_total_amount);
        UPDATE users
        SET loyalty_points = loyalty_points + v_loyalty_points
        WHERE user_id = p_user_id;
        
        SET out_message = 'Booking successful';
        COMMIT;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 2: Cancel Booking
-- =====================================================
DELIMITER $$

CREATE PROCEDURE CancelBooking(
    IN p_booking_id INT,
    IN p_user_id INT,
    OUT out_status VARCHAR(20),
    OUT out_message VARCHAR(255)
)
BEGIN
    DECLARE v_train_id INT;
    DECLARE v_passengers_count INT;
    DECLARE v_booking_user_id INT;
    
    -- Exception handling
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET out_status = 'ERROR';
        SET out_message = 'Cancellation failed due to database error';
    END;
    
    START TRANSACTION;
    
    -- Get booking details
    SELECT train_id, passengers_count, user_id
    INTO v_train_id, v_passengers_count, v_booking_user_id
    FROM bookings
    WHERE booking_id = p_booking_id
    FOR UPDATE;
    
    -- Verify user owns this booking
    IF v_booking_user_id != p_user_id THEN
        SET out_status = 'ERROR';
        SET out_message = 'Unauthorized: You cannot cancel this booking';
        ROLLBACK;
    ELSE
        -- Update booking status
        UPDATE bookings
        SET booking_status = 'cancelled'
        WHERE booking_id = p_booking_id;
        
        -- Restore seats
        UPDATE trains
        SET available_seats = available_seats + v_passengers_count
        WHERE train_id = v_train_id;
        
        -- Update payment status
        UPDATE payments
        SET payment_status = 'refunded'
        WHERE booking_id = p_booking_id;
        
        SET out_status = 'SUCCESS';
        SET out_message = 'Booking cancelled successfully';
        COMMIT;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 3: Generate Revenue Report (with CURSOR)
-- =====================================================
DELIMITER $$

CREATE PROCEDURE GenerateRevenueReport(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_train_id INT;
    DECLARE v_train_number VARCHAR(10);
    DECLARE v_total_bookings INT;
    DECLARE v_total_revenue DECIMAL(15,2);
    
    -- Cursor to iterate through all trains
    DECLARE train_cursor CURSOR FOR
        SELECT 
            t.train_id,
            t.train_number,
            COUNT(b.booking_id) as booking_count,
            COALESCE(SUM(b.total_amount), 0) as revenue
        FROM trains t
        LEFT JOIN bookings b ON t.train_id = b.train_id
            AND b.booking_date BETWEEN p_start_date AND p_end_date
            AND b.booking_status = 'confirmed'
        GROUP BY t.train_id, t.train_number
        ORDER BY revenue DESC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Create temporary table for results
    DROP TEMPORARY TABLE IF EXISTS temp_revenue_report;
    CREATE TEMPORARY TABLE temp_revenue_report (
        train_id INT,
        train_number VARCHAR(10),
        total_bookings INT,
        total_revenue DECIMAL(15,2),
        revenue_rank INT
    );
    
    SET @rank = 0;
    
    OPEN train_cursor;
    
    read_loop: LOOP
        FETCH train_cursor INTO v_train_id, v_train_number, v_total_bookings, v_total_revenue;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET @rank = @rank + 1;
        
        INSERT INTO temp_revenue_report
        VALUES (v_train_id, v_train_number, v_total_bookings, v_total_revenue, @rank);
    END LOOP;
    
    CLOSE train_cursor;
    
    -- Return the report
    SELECT * FROM temp_revenue_report;
END$$

DELIMITER ;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert admin user (password: "secret")
INSERT INTO users (username, email, password_hash, first_name, last_name, user_type) VALUES
('admin', 'admin@train.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'System', 'Admin', 'admin');

-- Insert railways
INSERT INTO railways (railway_name, railway_code, contact_number, email) VALUES
('Indian Railways', 'IR', '139', 'contact@indianrail.gov.in'),
('Rajdhani Express', 'RJ', '18001801407', 'customercare@rajdhani.in'),
('Shatabdi Express', 'SH', '9876543210', 'care@shatabdi.in');

-- Insert trains
INSERT INTO trains (train_number, railway_id, source_city, destination_city, departure_time, arrival_time, total_seats, available_seats, price, created_by) VALUES
('12951', 1, 'Delhi', 'Mumbai', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY + INTERVAL 16 HOUR), 400, 400, 1500.00, 1),
('12009', 2, 'Mumbai', 'Chennai', DATE_ADD(NOW(), INTERVAL 1 DAY + INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 1 DAY + INTERVAL 18 HOUR), 350, 350, 1200.00, 1),
('12301', 3, 'Bangalore', 'Delhi', DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY + INTERVAL 8 HOUR), 450, 450, 1800.00, 1);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test functions
SELECT 
    train_id,
    train_number,
    CheckSeatAvailability(train_id) as availability_status,
    CalculateTravelDuration(train_id) as duration_hours
FROM trains;

SELECT CalculateLoyaltyPoints(1500.00) as loyalty_points;
