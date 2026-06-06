-- Schema for SACCO-specific tables
CREATE TABLE IF NOT EXISTS sacco (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    registration_number VARCHAR(100),
    country VARCHAR(50) DEFAULT 'Kenya',
    currency VARCHAR(20) DEFAULT 'KES',
    contribution_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    contribution_frequency VARCHAR(40) DEFAULT 'Monthly',
    contribution_description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sacco_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sacco_id INT NOT NULL,
    user_email VARCHAR(150) NOT NULL,
    role ENUM('member', 'chairperson', 'treasurer', 'secretary') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (sacco_id) REFERENCES sacco(id) ON DELETE CASCADE,
    UNIQUE KEY unique_sacco_user (sacco_id, user_email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sacco_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sacco_id INT NOT NULL,
    user_email VARCHAR(150) NOT NULL,
    type VARCHAR(40) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sacco_id) REFERENCES sacco(id) ON DELETE CASCADE
) ENGINE=InnoDB;
