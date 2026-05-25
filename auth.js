// Authentication module - user registration, login, password hashing
const crypto = require('crypto');
const pool = require('./db');

// Simple password hashing using PBKDF2 (no external dependencies required)
function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, hash] = passwordHash.split(':');
  const hashVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
}

// Generate JWT-like token (simple version without external lib)
function generateToken(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ 
    userId, 
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  })).toString('base64');
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key').update(`${header}.${payload}`).digest('base64');
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const newSignature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key').update(`${header}.${payload}`).digest('base64');
    if (signature !== newSignature) return null;
    
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null; // Token expired
    return decoded;
  } catch (err) {
    return null;
  }
}

// Register new user
async function registerUser(email, password, firstName = '', lastName = '') {
  try {
    const connection = await pool.getConnection();
    
    // Check if user exists
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      connection.release();
      return { success: false, error: 'Email already registered' };
    }
    
    // Create new user
    const passwordHash = hashPassword(password);
    const [result] = await connection.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [email, passwordHash, firstName, lastName]
    );
    
    connection.release();
    return { success: true, userId: result.insertId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Login user
async function loginUser(email, password) {
  try {
    const connection = await pool.getConnection();
    
    const [users] = await connection.execute('SELECT id, password_hash FROM users WHERE email = ? AND is_active = TRUE', [email]);
    connection.release();
    
    if (users.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    const user = users[0];
    if (!verifyPassword(password, user.password_hash)) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    // Update last login
    const connection2 = await pool.getConnection();
    await connection2.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    connection2.release();
    
    const token = generateToken(user.id);
    return { success: true, userId: user.id, token };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Get user by ID
async function getUserById(userId) {
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, resume_keywords, target_companies, created_at FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );
    connection.release();
    
    return users.length > 0 ? users[0] : null;
  } catch (err) {
    console.error('Error fetching user:', err);
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  getUserById,
};
