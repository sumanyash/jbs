# Job Match Portal - New UI Guide

## 🎯 Features Overview

### **User Features**

#### 1. **First-Time User Flow**
- Register with email/password
- Set up profile with resume keywords and target companies
- System automatically matches you with relevant jobs
- All your data is saved in the database

#### 2. **Jobs Page**
- **Daily Job Updates**: Set sync frequency (10/20/50 jobs per day)
- **Smart Filtering**:
  - Search by job title or company
  - Filter by score (90+, 70+, 50+)
  - Filter by source (Remotive, LinkedIn, Arbeitnow)
- **Pagination**: Browse through jobs easily
- **Job Score**: AI-calculated match score (0-100)
- **One-Click Save**: Save jobs for later review

#### 3. **Saved Jobs**
- View all your saved jobs in one place
- Pagination for easy browsing
- **Export to CSV**: Download your saved jobs
- Quick action to unsave jobs

#### 4. **Settings**
- **Sync Frequency**: Choose 10, 20, or 50 jobs per sync
- **Minimum Score**: Set minimum job match score (0-100)
- **Auto-sync**: Enable/disable automatic job syncing
- Save all preferences

#### 5. **Profile**
- View and update your profile
- Add resume keywords (AI Voice, DevOps, Cloud, etc.)
- Add target companies
- Track your profile completeness

#### 6. **Admin Panel**
- Dashboard with stats (Users, Jobs, Saved, Last Sync)
- User management (view all users)
- Jobs management (view all jobs)
- System settings (default sync count, min score)
- Manual job sync trigger

---

## 🔐 Authentication

### Register
```
1. Click "Register" tab
2. Enter email, password, name
3. Account created automatically
```

### Login
```
1. Enter email and password
2. Get instant access to your jobs
3. Token saves for 7 days
```

### Logout
```
1. Click "Logout" in sidebar
2. All session data cleared
3. Redirect to login page
```

---

## 💼 Jobs Management

### View Available Jobs
```
1. Go to "Jobs" section
2. Click "Sync Now" to fetch latest
3. Jobs appear in grid format
4. Each card shows:
   - Job title
   - Company name
   - Location
   - AI Match Score
   - Brief description
   - Save and Visit buttons
```

### Filter Jobs
```
Filters available:
- Search: By title or company
- Score: 90+, 70+, 50+ matches
- Source: Remotive, LinkedIn, Arbeitnow
- Multiple filters work together
```

### Pagination
```
- Page size: 20 jobs per page (configurable)
- Previous/Next buttons
- Current page indicator
- Auto-scroll to top
```

### Save a Job
```
1. Find a job in the list
2. Click "💾 Save" button
3. Job saved to your database
4. Badge updates with count
5. Access anytime from "Saved" section
```

### Visit Job Posting
```
1. Click "🔗 Visit" button
2. Opens in new tab
3. Original job posting opens
```

---

## 📋 Saved Jobs

### View Saved Jobs
```
1. Click "Saved" in sidebar
2. See all your saved jobs
3. Separate pagination for saved jobs
4. Same filtering options available
```

### Export to CSV
```
1. Click "📥 Export CSV" button
2. Downloads file with:
   - Title, Company, Location
   - Score, URL
3. Open in Excel or Google Sheets
```

### Unsave Jobs
```
1. Go to "Saved" section
2. Click "✓ Saved" button to unsave
3. Job removed from saved list
4. Badge count updates
```

---

## ⚙️ Settings

### Sync Frequency
```
Choose how many jobs to sync:
- 10 jobs (quick sync)
- 20 jobs (balanced) ← default
- 50 jobs (comprehensive)
```

### Minimum Score
```
Slider: 0 to 100
- Only see jobs above this score
- Higher score = better matches
- Default: 50
```

### Auto-Sync
```
Toggle ON/OFF
- ON: System syncs jobs daily
- OFF: Manual sync only
```

---

## 👤 Profile

### Update Personal Info
```
1. Go to "Profile" section
2. Edit:
   - First Name
   - Last Name
   - Email (read-only)
```

### Add Resume Keywords
```
1. Enter keywords (comma-separated):
   - "AI Voice Engineer, DevOps, Kubernetes"
   - "Backend Developer, Python, AWS"
2. System uses these to match jobs
3. More keywords = better matches
```

### Add Target Companies
```
1. Enter company names (comma-separated):
   - "Google, Microsoft, Amazon"
   - "Startup X, Company Y"
2. Prioritize jobs from these companies
```

---

## 🔑 Admin Panel

### Access Admin
```
1. Click "🔑 Admin" in sidebar
2. Enter password (default: admin123)
3. Access to admin dashboard
```

### Dashboard
```
View at a glance:
- Total users registered
- Total jobs in system
- Total saved jobs by all users
- Last sync timestamp
- Manual sync button
```

### User Management
```
View all registered users:
- Email addresses
- Registration date
- Active status
- Number of saved jobs
```

### Jobs Management
```
View all jobs:
- Job title and company
- Score and location
- Source (where job came from)
- Number of times saved
```

### System Settings
```
Configure:
- Default sync count for new users
- Minimum score threshold
- Enable/disable features
```

---

## 📊 Statistics

### Sidebar Stats
```
Three quick metrics:
1. Total Jobs Loaded: X jobs in system
2. Avg Score: Average match score
3. Saved: Your saved jobs count
```

### Job Card Stats
```
Each job shows:
- Score (0-100): AI match percentage
- Location with emoji
- Company name (in purple)
- Brief description
```

---

## 🎨 UI/UX Features

### Clean Design
```
- Minimalist sidebar (240px wide)
- Responsive grid layout
- Mobile-friendly (collapses on small screens)
- Dark/Light card contrast
```

### Navigation
```
- Sticky sidebar
- Quick access to all sections
- Active page highlighting
- Breadcrumb not needed (sections clear)
```

### Responsiveness
```
- Desktop: Full sidebar + content
- Tablet: Collapsed sidebar icons only
- Mobile: Top navigation (coming soon)
```

### Visual Feedback
```
- Hover effects on cards
- Toast notifications (bottom-right)
- Loading states
- Disabled button states
```

---

## 🔔 Notifications

### Toast Messages
```
Success: Green ✓
- "Login successful!"
- "Job saved!"
- "Settings saved!"

Error: Red ✗
- "Login failed"
- "Network error"

Info: Blue ℹ
- "No jobs found"
```

---

## 🚀 Usage Examples

### Scenario 1: New User
```
1. Register → Profile created
2. Go to Jobs → Click "Sync Now"
3. 20 jobs appear
4. Browse and save interesting ones
5. Go to Saved → Review saved jobs
6. Go to Profile → Add keywords
7. Next sync will be more personalized
```

### Scenario 2: Experienced User
```
1. Login with credentials
2. Go to Settings → Change sync to 50 jobs
3. Go to Jobs → "Sync Now"
4. Filter by score (90+)
5. Save top matches
6. Export saved jobs to CSV
```

### Scenario 3: Admin
```
1. Click "🔑 Admin"
2. Dashboard shows 45 users, 1200 jobs
3. Click "👥 Users" → See all 45 users
4. Click "⚙️ Settings" → Adjust defaults
5. Click "Sync Now" → Manually refresh all jobs
```

---

## ✅ Checklist for First-Time Setup

- [ ] Register account
- [ ] Update profile with keywords
- [ ] Add target companies
- [ ] Sync jobs (click "Sync Now")
- [ ] Browse jobs and save 5+ jobs
- [ ] Go to Saved → Verify jobs appear
- [ ] Try export to CSV
- [ ] Adjust settings (sync frequency, min score)
- [ ] Logout and login to verify persistence
- [ ] Share with others/go to admin

---

## 🆘 Troubleshooting

### Jobs not loading?
```
1. Check internet connection
2. Click "Sync Now" button
3. Wait 5-10 seconds
4. Refresh page if needed
5. Check browser console for errors
```

### Can't save jobs?
```
1. Verify you're logged in
2. Check token in console
3. Try different job
4. Refresh and try again
5. Check server status
```

### Settings not saving?
```
1. Click "Save Settings" button
2. Wait for success toast
3. Refresh page to verify
4. Check browser localStorage
```

### CSV export not working?
```
1. Verify you have saved jobs
2. Try different browser
3. Check browser download settings
4. Allow downloads if blocked
```

---

## 📱 Mobile View (Coming Soon)

```
- Bottom navigation instead of sidebar
- Full-width job cards
- Touch-friendly buttons
- Swipe navigation
```

---

## 🔐 Security Notes

```
✅ Passwords:
   - Hashed with PBKDF2
   - Never stored in plain text
   
✅ Tokens:
   - JWT with 7-day expiration
   - Stored in localStorage
   - Sent with every API request
   
✅ Data:
   - Per-user database isolation
   - HTTPS encryption
   - SQL injection prevention
```

---

## 💾 Browser Storage

```
Automatically saved:
- Login token
- User ID
- User profile data
- Settings (sync count, min score)
- Auto-sync preference

Cleared on logout:
- All session data
- Token becomes invalid
```

---

## 🎓 Tips & Tricks

```
1. Use specific keywords in profile
   → Better job matches

2. Set higher minimum score
   → Fewer but better matches

3. Export regularly
   → Keep backup of saved jobs

4. Check "Auto-sync" setting
   → Don't miss new jobs

5. Update profile often
   → Stay relevant to jobs

6. Try different filters
   → Find hidden gems

7. Visit job links
   → Check company websites
```

---

## 📞 Support

For issues or questions:
1. Check "Saved" section - your data is safe
2. Try logout/login
3. Clear browser cache
4. Check notification toast for error details
5. Contact admin for account issues

---

**UI Version**: 2.0  
**Last Updated**: May 26, 2026  
**Status**: ✅ Production Ready
