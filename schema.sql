-- Job Search Portal - Multi-User Schema
-- MySQL Database Setup

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  resume_keywords TEXT,
  target_companies TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
);

-- Jobs table (shared, cached from Apify)
CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  company VARCHAR(255),
  location VARCHAR(255),
  description TEXT,
  url VARCHAR(500),
  source VARCHAR(50),
  salary_min INT,
  salary_max INT,
  job_type VARCHAR(50),
  posted_date DATETIME,
  score INT DEFAULT 0,
  ai_summary TEXT,
  keywords_matched TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_job_id (job_id),
  INDEX idx_company (company),
  INDEX idx_posted_date (posted_date),
  INDEX idx_score (score)
);

-- Saved jobs per user
CREATE TABLE IF NOT EXISTS saved_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  status ENUM('saved', 'applied', 'rejected', 'shortlisted') DEFAULT 'saved',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_job (user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- Search history per user
CREATE TABLE IF NOT EXISTS search_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  search_query TEXT,
  filters JSON,
  results_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- API sync logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sync_type VARCHAR(50),
  jobs_fetched INT,
  jobs_updated INT,
  last_sync TIMESTAMP,
  next_sync TIMESTAMP,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
);
