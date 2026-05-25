// Global State
let appState = {
    token: localStorage.getItem('token'),
    userId: localStorage.getItem('userId'),
    user: JSON.parse(localStorage.getItem('user') || '{}'),
    isAdmin: localStorage.getItem('isAdmin') === 'true',
    currentPage: 1,
    jobsPerPage: 20,
    allJobs: [],
    savedJobs: [],
    filteredJobs: [],
};

const API_BASE = window.location.origin;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    if (appState.token) {
        showDashboard();
        loadUserData();
        loadJobs();
        updateStats();
    } else {
        showAuthPage();
    }
});

// ============ AUTH FUNCTIONS ============

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const [email, password] = [...e.target.querySelectorAll('input')].map(i => i.value);
    
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (data.success) {
            appState.token = data.token;
            appState.userId = data.userId;
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            showToast('Login successful!', 'success');
            showDashboard();
            loadUserData();
            loadJobs();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Login failed', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const [email, password, firstName, lastName] = [...e.target.querySelectorAll('input')].map(i => i.value);
    
    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, firstName, lastName })
        });
        const data = await res.json();
        
        if (data.success) {
            appState.token = data.token;
            appState.userId = data.userId;
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            showToast('Registration successful!', 'success');
            showDashboard();
            loadUserData();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Registration failed', 'error');
    }
}

function logout() {
    localStorage.clear();
    appState.token = null;
    location.reload();
}

// ============ PAGE NAVIGATION ============

function showAuthPage() {
    document.getElementById('auth-page').style.display = 'flex';
    document.getElementById('dashboard-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'none';
}

function showDashboard() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'flex';
    document.getElementById('admin-page').style.display = 'none';
}

function showAdminDashboard() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'flex';
    loadAdminStats();
}

function showPage(sectionId) {
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    if (sectionId === 'profile-section') {
        loadProfileData();
    }
}

function showAdminPage(pageType) {
    document.querySelectorAll('#admin-page .content-section').forEach(el => el.style.display = 'none');
    
    if (pageType === 'dashboard') {
        document.getElementById('admin-dashboard').style.display = 'block';
    } else if (pageType === 'users') {
        document.getElementById('admin-users-section').style.display = 'block';
        loadAdminUsers();
    } else if (pageType === 'jobs') {
        document.getElementById('admin-jobs-section').style.display = 'block';
        loadAdminJobs();
    } else if (pageType === 'settings') {
        document.getElementById('admin-settings-section').style.display = 'block';
    }
    
    document.querySelectorAll('#admin-page .nav-item').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
}

function checkAdmin() {
    // Simple admin check - you can enhance this
    const password = prompt('Enter admin password:');
    if (password === 'admin123') {
        appState.isAdmin = true;
        localStorage.setItem('isAdmin', 'true');
        showAdminDashboard();
    } else {
        showToast('Invalid password', 'error');
    }
}

// ============ JOBS FUNCTIONS ============

async function loadJobs() {
    try {
        const res = await fetch(`${API_BASE}/api/jobs`, {
            headers: { 'Authorization': `Bearer ${appState.token}` }
        });
        const data = await res.json();
        appState.allJobs = data.items || [];
        appState.filteredJobs = [...appState.allJobs];
        displayJobs();
        updateStats();
    } catch (err) {
        console.error('Failed to load jobs:', err);
    }
}

async function loadSavedJobs() {
    try {
        const res = await fetch(`${API_BASE}/api/user/saved-jobs`, {
            headers: { 'Authorization': `Bearer ${appState.token}` }
        });
        const data = await res.json();
        appState.savedJobs = data.jobs || [];
        displaySavedJobs();
    } catch (err) {
        console.error('Failed to load saved jobs:', err);
    }
}

async function syncJobs() {
    try {
        document.getElementById('sync-btn').disabled = true;
        document.getElementById('sync-btn').textContent = '⏳ Syncing...';
        
        const res = await fetch(`${API_BASE}/api/jobs/sync`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${appState.token}` }
        });
        const data = await res.json();
        
        appState.allJobs = data.items || [];
        appState.filteredJobs = [...appState.allJobs];
        appState.currentPage = 1;
        displayJobs();
        updateStats();
        showToast(`Loaded ${data.items.length} jobs!`, 'success');
    } catch (err) {
        showToast('Sync failed', 'error');
    } finally {
        document.getElementById('sync-btn').disabled = false;
        document.getElementById('sync-btn').textContent = '↻ Sync Now';
    }
}

async function adminSyncJobs() {
    await syncJobs();
}

function displayJobs() {
    const start = (appState.currentPage - 1) * appState.jobsPerPage;
    const end = start + appState.jobsPerPage;
    const pagJobs = appState.filteredJobs.slice(start, end);
    
    const container = document.getElementById('jobs-container');
    
    if (pagJobs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No jobs found. Try adjusting filters.</p></div>';
        return;
    }
    
    container.innerHTML = pagJobs.map(job => `
        <div class="job-card">
            <div class="job-header">
                <div class="job-title">${job.title}</div>
                <div class="job-company">${job.company}</div>
            </div>
            <div class="job-meta">
                <span class="job-score">Score: ${job.score || 0}</span>
            </div>
            <div class="job-location">📍 ${job.location}</div>
            <div class="job-description">${job.description?.substring(0, 100) || 'No description'}...</div>
            <div class="job-actions">
                <button class="btn-save" onclick="saveJob(${JSON.stringify(job).replace(/"/g, '&quot;')})">💾 Save</button>
                <a href="${job.url}" target="_blank" class="btn-visit">🔗 Visit</a>
            </div>
        </div>
    `).join('');
    
    updatePagination();
    loadSavedJobs();
}

function displaySavedJobs() {
    const start = (appState.currentPage - 1) * appState.jobsPerPage;
    const end = start + appState.jobsPerPage;
    const pagJobs = appState.savedJobs.slice(start, end);
    
    const container = document.getElementById('saved-container');
    
    if (pagJobs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No saved jobs yet!</p></div>';
        return;
    }
    
    container.innerHTML = pagJobs.map(job => `
        <div class="job-card">
            <div class="job-header">
                <div class="job-title">${job.title}</div>
                <div class="job-company">${job.company}</div>
            </div>
            <div class="job-meta">
                <span class="job-score">Score: ${job.score || 0}</span>
            </div>
            <div class="job-location">📍 ${job.location}</div>
            <div class="job-actions">
                <button class="btn-save saved" onclick="deleteSavedJob(${job.id})">✓ Saved</button>
                <a href="${job.url}" target="_blank" class="btn-visit">🔗 Visit</a>
            </div>
        </div>
    `).join('');
}

async function saveJob(job) {
    try {
        const res = await fetch(`${API_BASE}/api/user/save-job`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.token}`
            },
            body: JSON.stringify({ jobData: job })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast('Job saved! ✓', 'success');
            loadSavedJobs();
            updateStats();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Failed to save job', 'error');
    }
}

async function deleteSavedJob(jobId) {
    try {
        const res = await fetch(`${API_BASE}/api/user/delete-job`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.token}`
            },
            body: JSON.stringify({ jobId })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast('Job removed', 'success');
            loadSavedJobs();
            updateStats();
        }
    } catch (err) {
        showToast('Failed to remove job', 'error');
    }
}

function filterJobs() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const scoreFilter = document.getElementById('score-filter').value;
    const sourceFilter = document.getElementById('source-filter').value;
    
    appState.filteredJobs = appState.allJobs.filter(job => {
        const matchSearch = !search || 
            job.title.toLowerCase().includes(search) || 
            job.company.toLowerCase().includes(search);
        const matchScore = !scoreFilter || (job.score || 0) >= parseInt(scoreFilter);
        const matchSource = !sourceFilter || job.source === sourceFilter;
        
        return matchSearch && matchScore && matchSource;
    });
    
    appState.currentPage = 1;
    displayJobs();
}

// ============ PAGINATION ============

function prevPage() {
    if (appState.currentPage > 1) {
        appState.currentPage--;
        displayJobs();
        window.scrollTo(0, 0);
    }
}

function nextPage() {
    const maxPages = Math.ceil(appState.filteredJobs.length / appState.jobsPerPage);
    if (appState.currentPage < maxPages) {
        appState.currentPage++;
        displayJobs();
        window.scrollTo(0, 0);
    }
}

function updatePagination() {
    const maxPages = Math.ceil(appState.filteredJobs.length / appState.jobsPerPage);
    document.getElementById('page-info').textContent = `Page ${appState.currentPage} of ${maxPages}`;
    document.getElementById('prev-btn').disabled = appState.currentPage === 1;
    document.getElementById('next-btn').disabled = appState.currentPage === maxPages;
}

function prevSavedPage() {
    if (appState.currentPage > 1) {
        appState.currentPage--;
        displaySavedJobs();
    }
}

function nextSavedPage() {
    const maxPages = Math.ceil(appState.savedJobs.length / appState.jobsPerPage);
    if (appState.currentPage < maxPages) {
        appState.currentPage++;
        displaySavedJobs();
    }
}

// ============ PROFILE & SETTINGS ============

async function loadUserData() {
    try {
        const res = await fetch(`${API_BASE}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${appState.token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            appState.user = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
            document.getElementById('user-email').textContent = data.user.email;
        }
    } catch (err) {
        console.error('Failed to load user data:', err);
    }
}

function loadProfileData() {
    document.getElementById('profile-email').value = appState.user.email || '';
    document.getElementById('profile-first').value = appState.user.first_name || '';
    document.getElementById('profile-last').value = appState.user.last_name || '';
    document.getElementById('profile-keywords').value = appState.user.resume_keywords || '';
    document.getElementById('profile-companies').value = appState.user.target_companies || '';
}

async function updateProfile() {
    // This would need a new API endpoint to update profile
    showToast('Profile update coming soon!', 'success');
}

function saveSettings() {
    const syncCount = document.querySelector('input[name="sync-count"]:checked').value;
    const minScore = document.getElementById('min-score-slider').value;
    const autoSync = document.getElementById('auto-sync-check').checked;
    
    localStorage.setItem('syncCount', syncCount);
    localStorage.setItem('minScore', minScore);
    localStorage.setItem('autoSync', autoSync);
    
    appState.jobsPerPage = parseInt(syncCount);
    showToast('Settings saved!', 'success');
}

function updateScoreLabel() {
    const value = document.getElementById('min-score-slider').value;
    document.getElementById('score-label').textContent = value;
}

// ============ STATS ============

function updateStats() {
    const savedCount = appState.savedJobs.length;
    const avgScore = appState.allJobs.length > 0 
        ? Math.round(appState.allJobs.reduce((sum, j) => sum + (j.score || 0), 0) / appState.allJobs.length)
        : 0;
    
    document.getElementById('stat-total').textContent = appState.allJobs.length;
    document.getElementById('stat-avg').textContent = avgScore;
    document.getElementById('stat-saved').textContent = savedCount;
    document.getElementById('saved-badge').textContent = savedCount;
    document.getElementById('saved-count').textContent = savedCount;
}

// ============ ADMIN FUNCTIONS ============

async function loadAdminStats() {
    // This would need admin-specific endpoints
    document.getElementById('admin-users').textContent = '?';
    document.getElementById('admin-jobs').textContent = appState.allJobs.length;
    document.getElementById('admin-saved').textContent = appState.savedJobs.length;
    document.getElementById('admin-sync').textContent = new Date().toLocaleString();
}

async function loadAdminUsers() {
    // Would need admin endpoint to get all users
    showToast('Admin user listing coming soon!', 'success');
}

async function loadAdminJobs() {
    // Would need admin endpoint
    showToast('Admin job listing coming soon!', 'success');
}

function adminSaveSettings() {
    showToast('Admin settings saved!', 'success');
}

// ============ EXPORT ============

function exportToCSV() {
    if (appState.savedJobs.length === 0) {
        showToast('No jobs to export', 'error');
        return;
    }
    
    const headers = ['Title', 'Company', 'Location', 'Score', 'URL'];
    const rows = appState.savedJobs.map(job => [
        job.title,
        job.company,
        job.location,
        job.score,
        job.url
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast('CSV exported!', 'success');
}

// ============ UTILITIES ============

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
