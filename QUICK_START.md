# Job Search Portal v2.0 - Quick Reference

## 📦 What Was Built

A complete multi-user job search portal rebuild for enterprise use with:
- User authentication (email/password)
- MySQL database backend
- User-specific job management
- Centralized Apify integration
- Free job provider support
- All v1.0 features preserved

---

## 🚀 Get Started in 3 Minutes

```bash
cd /var/www/job-search-portal

# 1. Setup (automated)
./setup.sh

# OR manual steps:
# - Copy .env.example → .env
# - Edit .env with your MySQL credentials
# - Create database: mysql < schema.sql
# - Install: npm install

# 2. Start server
node server.js

# 3. Access
open http://localhost:4173
```

---

## 📚 Key Files

| File | Purpose | Status |
|------|---------|--------|
| `server.js` | Main application server | ✅ Updated with multi-user |
| `auth.js` | Authentication & JWT | ✅ NEW |
| `db.js` | MySQL connection pool | ✅ NEW |
| `schema.sql` | Database structure | ✅ Updated |
| `.env.example` | Configuration template | ✅ Updated |
| `package.json` | Node dependencies | ✅ Updated |
| `setup.sh` | Automated setup | ✅ NEW |

---

## 🔑 Core Endpoints

### Public
```
GET  /health                    - Health check
GET  /api/config               - Portal config
POST /api/auth/register        - Sign up
POST /api/auth/login           - Sign in
GET  /api/jobs                 - Public job list
POST /api/jobs/sync            - Refresh jobs
```

### Protected (requires Bearer token)
```
GET  /api/user/profile         - Your profile
GET  /api/user/saved-jobs      - Your saved jobs
POST /api/user/save-job        - Save a job
POST /api/user/delete-job      - Remove saved job
```

---

## 🔐 Environment Variables

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=job_search_portal

# Security
JWT_SECRET=<generate with: openssl rand -base64 32>

# Apify (optional)
APIFY_API_KEY=
APIFY_TASK_ID=

# Server
PORT=4173
```

---

## 💻 Example: Register & Save Job

```bash
# 1. Register
TOKEN=$(curl -s -X POST http://localhost:4173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "firstName": "John"
  }' | jq -r '.token')

# 2. Save a job
curl -X POST http://localhost:4173/api/user/save-job \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jobData": {
      "id": "job-123",
      "title": "Backend Engineer",
      "company": "TechCorp",
      "location": "Remote",
      "url": "https://example.com/job",
      "score": 85
    }
  }'

# 3. Get saved jobs
curl http://localhost:4173/api/user/saved-jobs \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🗄️ Database Schema (Quick View)

```
users
├── id (PK)
├── email (UNIQUE)
├── password_hash
├── first_name, last_name
└── created_at, last_login

jobs
├── id (PK)
├── job_id (UNIQUE) - External ID
├── title, company, location
├── description, url
├── source, score
└── posted_date

saved_jobs
├── id (PK)
├── user_id (FK → users)
├── job_id (FK → jobs)
├── status (saved/applied/rejected/shortlisted)
├── notes
└── created_at
```

---

## 🎯 Next Steps

### Immediate
- [ ] Edit `.env` with your database credentials
- [ ] Run `./setup.sh` to create database
- [ ] Start server: `node server.js`
- [ ] Test endpoints with curl

### Soon
- [ ] Integrate frontend (see `FRONTEND_INTEGRATION.js`)
- [ ] Create test user accounts
- [ ] Configure Apify (optional)
- [ ] Customize job keywords

### Later
- [ ] Deploy to production
- [ ] Set up PM2 process manager
- [ ] Configure Nginx reverse proxy
- [ ] Enable HTTPS/SSL

---

## 🐛 Troubleshooting

**Can't connect to database?**
```bash
# Check MySQL is running
systemctl status mysql

# Test connection manually
mysql -h localhost -u root -p -e "SELECT 1;"
```

**Port 4173 already in use?**
```bash
# Use different port
PORT=5000 node server.js

# Or find process using port
lsof -i :4173
```

**Database error on startup?**
```bash
# Make sure schema was imported
mysql job_search_portal < schema.sql

# Verify tables exist
mysql -e "SHOW TABLES IN job_search_portal;"
```

---

## 📖 Documentation

- **Setup Guide**: `SETUP_ENTERPRISE.md` - Complete setup instructions
- **Implementation**: `IMPLEMENTATION_SUMMARY.md` - What was built
- **Frontend Code**: `FRONTEND_INTEGRATION.js` - JavaScript examples
- **Original Readme**: `README.md` - v1.0 documentation

---

## 🎓 Architecture

```
┌──────────────────┐
│   Web Browser    │
└────────┬─────────┘
         │ HTTPS/HTTP
    ┌────▼──────────────┐
    │  Node.js Server   │
    │   (server.js)     │
    └────┬──────────────┘
         │
    ┌────┴────────────────┐
    │                     │
┌───▼────────┐      ┌─────▼─────┐
│   MySQL    │      │   APIs    │
│  Database  │      │ (Apify)   │
└────────────┘      └───────────┘
```

---

## 📊 Feature Comparison

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Single user | ✅ | ✅ |
| Multiple users | ❌ | ✅ |
| Database | JSON | MySQL |
| Authentication | ❌ | ✅ |
| Job saving | Browser | Database |
| API | Limited | Full REST |
| Scalability | Local | Enterprise |
| Job providers | 3 free + Apify | 3 free + Apify |

---

## 🔗 Resources

- **Node.js Docs**: https://nodejs.org/docs/
- **MySQL Guide**: https://dev.mysql.com/doc/
- **Apify API**: https://docs.apify.com/api/
- **JWT Intro**: https://jwt.io/

---

## ✅ Checklist Before Going Live

- [ ] Database credentials in `.env`
- [ ] JWT_SECRET changed from default
- [ ] Node packages installed (`npm install`)
- [ ] Database created and populated
- [ ] Server starts without errors
- [ ] API endpoints tested with curl
- [ ] User registration/login working
- [ ] Job save/retrieve working
- [ ] Ready for frontend integration

---

## 📞 Need Help?

1. Check `SETUP_ENTERPRISE.md` for detailed setup
2. Review `IMPLEMENTATION_SUMMARY.md` for architecture
3. See `FRONTEND_INTEGRATION.js` for code examples
4. Test endpoints individually with curl
5. Check MySQL tables: `mysql job_search_portal`
6. Review server logs: `node server.js` (console output)

---

**Version**: 2.0 (Multi-User Enterprise Edition)  
**Last Updated**: 2026-05-26  
**Status**: ✅ Ready for Configuration

