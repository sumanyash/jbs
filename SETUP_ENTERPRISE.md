# Job Search Portal v2.0 - Multi-User Enterprise Setup Guide

## Overview
This is a complete rebuild of the job search portal with multi-user support, MySQL database backend, and enterprise-ready features.

## Features
- ✅ **Multi-User Authentication** - Email/password registration and login
- ✅ **Centralized Apify Integration** - One API key for all users
- ✅ **User-Specific Job Management** - Each user can save and track jobs independently
- ✅ **MySQL Backend** - Persistent storage for users, jobs, and preferences
- ✅ **Free Job Providers** - Automatic scraping from Remotive, Arbeitnow, JSearch
- ✅ **AI Job Scoring** - Intelligent ranking based on keywords and skills
- ✅ **Backward Compatible** - Existing endpoints still work

## Prerequisites
- Node.js 16+ 
- MySQL 5.7+
- Optional: Apify account for premium job scraping

## Quick Start

### 1. Configure Environment
```bash
cp .env.example .env
nano .env
```

**Required Variables:**
```
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=job_search_portal

# Security (change this!)
JWT_SECRET=your-super-secret-key-change-this

# Apify (optional - works without it using free providers)
APIFY_API_KEY=your_apify_key
APIFY_TASK_ID=username~task-name

# Server
PORT=4173
```

### 2. Setup MySQL Database
```bash
# Create database and import schema
mysql -u root -p < schema.sql

# Or manually
mysql -u root -p
```

```sql
CREATE DATABASE IF NOT EXISTS job_search_portal;
USE job_search_portal;
-- Import schema.sql here
```

### 3. Start the Server
```bash
node server.js
```

Server will run at `http://localhost:4173`

## API Endpoints

### Authentication (Public)
```
POST /api/auth/register
POST /api/auth/login
```

### User Management (Protected - require Bearer token)
```
GET  /api/user/profile
GET  /api/user/saved-jobs
POST /api/user/save-job
POST /api/user/delete-job
```

### Job Search (Public)
```
GET  /api/config          - Portal configuration
GET  /api/jobs            - All cached jobs
POST /api/jobs/sync       - Sync fresh jobs from providers
POST /api/apify/auto      - Run default Apify task
```

## Usage Examples

### Register User
```bash
curl -X POST http://localhost:4173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Response:
```json
{
  "success": true,
  "userId": 1,
  "token": "eyJhbGc...",
  "message": "Registration successful"
}
```

### Login User
```bash
curl -X POST http://localhost:4173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password"
  }'
```

### Save a Job (Protected)
```bash
curl -X POST http://localhost:4173/api/user/save-job \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jobData": {
      "id": "job-123",
      "title": "Senior Backend Engineer",
      "company": "TechCorp",
      "location": "Remote",
      "url": "https://example.com/job",
      "source": "LinkedIn",
      "description": "Job description here",
      "score": 85
    },
    "status": "saved",
    "notes": "Interesting opportunity"
  }'
```

### Get User Saved Jobs (Protected)
```bash
curl -X GET http://localhost:4173/api/user/saved-jobs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Schema

### Users Table
- id (INT, PRIMARY KEY)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- first_name, last_name (VARCHAR)
- resume_keywords, target_companies (TEXT)
- created_at, updated_at (TIMESTAMP)
- is_active (BOOLEAN)
- last_login (TIMESTAMP)

### Jobs Table
- id (INT, PRIMARY KEY)
- job_id (VARCHAR, UNIQUE) - External job ID
- title, company, location (VARCHAR)
- description, url (TEXT/VARCHAR)
- source (VARCHAR) - Provider name
- score (INT) - AI score (0-100)
- posted_date (DATETIME)

### Saved_Jobs Table
- id (INT, PRIMARY KEY)
- user_id (INT, FOREIGN KEY)
- job_id (INT, FOREIGN KEY)
- status (ENUM) - saved, applied, rejected, shortlisted
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)

## Deployment

### Production Setup

1. **Use a Process Manager**
```bash
npm install -g pm2
pm2 start server.js --name "job-portal" --instances max
pm2 save
```

2. **Set JWT_SECRET**
```bash
# Generate a secure random string
openssl rand -base64 32
# Put it in .env as JWT_SECRET
```

3. **Enable HTTPS** (recommended)
- Use Nginx as reverse proxy with SSL
- Or use Node.js ssl module

4. **Database Backups**
```bash
# Daily backup
0 2 * * * mysqldump -u root -p db_password job_search_portal > /backups/job_portal_$(date +\%Y\%m\%d).sql
```

### Nginx Configuration (Example)
```nginx
upstream job_portal {
  server localhost:4173;
}

server {
  listen 80;
  server_name jobs.example.com;
  
  location / {
    proxy_pass http://job_portal;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header Authorization $http_authorization;
  }
}
```

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
- Check MySQL is running: `systemctl status mysql`
- Verify DB_HOST, DB_USER, DB_PASSWORD in .env
- Ensure database exists: `mysql -u root -p -e "USE job_search_portal;"`

### Migration from v1.0
The old `/api/jobs` and `/api/jobs/sync` endpoints still work for backward compatibility. Users now have their own saved jobs via `/api/user/saved-jobs`.

### Performance Optimization
- Add database indexes: Already included in schema.sql
- Cache frequently accessed jobs
- Implement pagination for saved jobs

## Next Steps
1. Test with multiple user accounts
2. Customize resume keywords in user profile
3. Set up Apify task for premium job sources
4. Deploy to production server
5. Set up automated daily job syncs via scheduler

## Support
- Check logs: `tail -f /var/log/job-portal.log`
- Database debugging: `mysql -u root -p job_search_portal`
- API testing: Use Postman or curl

