// Database connection module for MySQL
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Load environment variables
function loadEnv() {
  const ENV_FILE = path.join(__dirname, '.env');
  if (!fs.existsSync(ENV_FILE)) return;
  const lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (process.env[key]) continue;
    process.env[key] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}

loadEnv();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'job_search_portal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Export pool for use in other modules
module.exports = pool;
