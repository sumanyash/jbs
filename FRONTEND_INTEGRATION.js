// Frontend Integration Guide - Multi-User Job Portal v2.0
// Add this to your public/app.js

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

class JobPortalAuth {
  constructor() {
    this.token = localStorage.getItem('job_portal_token');
    this.userId = localStorage.getItem('job_portal_userId');
    this.user = JSON.parse(localStorage.getItem('job_portal_user') || 'null');
  }

  async register(email, password, firstName = '', lastName = '') {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName })
      });
      const data = await response.json();
      
      if (data.success) {
        this.setToken(data.token);
        this.userId = data.userId;
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (data.success) {
        this.setToken(data.token);
        this.userId = data.userId;
        await this.loadProfile();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async loadProfile() {
    if (!this.token) return null;
    try {
      const response = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        this.user = data.user;
        localStorage.setItem('job_portal_user', JSON.stringify(this.user));
        return this.user;
      }
      return null;
    } catch (error) {
      console.error('Failed to load profile:', error);
      return null;
    }
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('job_portal_token', token);
  }

  logout() {
    this.token = null;
    this.userId = null;
    this.user = null;
    localStorage.removeItem('job_portal_token');
    localStorage.removeItem('job_portal_userId');
    localStorage.removeItem('job_portal_user');
  }

  isAuthenticated() {
    return !!this.token;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
    };
  }
}

// ============================================
// JOB MANAGEMENT FUNCTIONS
// ============================================

class JobPortalManager {
  constructor(auth) {
    this.auth = auth;
  }

  async saveJob(jobData, status = 'saved', notes = '') {
    if (!this.auth.isAuthenticated()) {
      return { success: false, error: 'Must be logged in to save jobs' };
    }

    try {
      const response = await fetch('/api/user/save-job', {
        method: 'POST',
        headers: this.auth.getHeaders(),
        body: JSON.stringify({ jobData, status, notes })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getSavedJobs() {
    if (!this.auth.isAuthenticated()) {
      return { success: false, error: 'Must be logged in' };
    }

    try {
      const response = await fetch('/api/user/saved-jobs', {
        headers: this.auth.getHeaders()
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteSavedJob(jobId) {
    if (!this.auth.isAuthenticated()) {
      return { success: false, error: 'Must be logged in' };
    }

    try {
      const response = await fetch('/api/user/delete-job', {
        method: 'POST',
        headers: this.auth.getHeaders(),
        body: JSON.stringify({ jobId })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncJobs() {
    try {
      const response = await fetch('/api/jobs/sync', {
        method: 'POST',
        headers: this.auth.getHeaders()
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getAvailableJobs() {
    try {
      const response = await fetch('/api/jobs', {
        headers: this.auth.getHeaders()
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================
// UI COMPONENTS EXAMPLE
// ============================================

// Initialize auth and job manager
const auth = new JobPortalAuth();
const jobPortal = new JobPortalManager(auth);

// Example: Check login status on page load
document.addEventListener('DOMContentLoaded', async () => {
  if (auth.isAuthenticated()) {
    await auth.loadProfile();
    showLoggedInUI();
  } else {
    showLoginUI();
  }
});

// Example: Login form handler
async function handleLogin(email, password) {
  const result = await auth.login(email, password);
  if (result.success) {
    alert('Login successful!');
    showLoggedInUI();
  } else {
    alert('Login failed: ' + result.error);
  }
}

// Example: Register form handler
async function handleRegister(email, password, firstName, lastName) {
  const result = await auth.register(email, password, firstName, lastName);
  if (result.success) {
    alert('Registration successful! Logged in.');
    showLoggedInUI();
  } else {
    alert('Registration failed: ' + result.error);
  }
}

// Example: Save job handler
async function saveCurrentJob(jobCard) {
  if (!auth.isAuthenticated()) {
    alert('Please login first');
    return;
  }

  const jobData = {
    id: jobCard.dataset.jobId,
    title: jobCard.querySelector('.job-title')?.textContent,
    company: jobCard.querySelector('.job-company')?.textContent,
    location: jobCard.querySelector('.job-location')?.textContent,
    url: jobCard.querySelector('a')?.href,
    description: jobCard.querySelector('.job-description')?.textContent,
    source: jobCard.dataset.source,
    score: jobCard.dataset.score
  };

  const result = await jobPortal.saveJob(jobData, 'saved');
  if (result.success) {
    alert('Job saved!');
    jobCard.classList.add('saved');
  } else {
    alert('Failed to save: ' + result.error);
  }
}

// Example: Show logged in UI
function showLoggedInUI() {
  const userGreeting = document.getElementById('user-greeting');
  if (userGreeting && auth.user) {
    userGreeting.textContent = `Welcome, ${auth.user.first_name || auth.user.email}!`;
  }
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('job-search').style.display = 'block';
  document.getElementById('saved-jobs-section').style.display = 'block';
}

// Example: Show login UI
function showLoginUI() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('job-search').style.display = 'none';
  document.getElementById('saved-jobs-section').style.display = 'none';
}

// Example: Logout
function handleLogout() {
  auth.logout();
  showLoginUI();
  alert('Logged out');
}

// Example: Load and display saved jobs
async function loadSavedJobs() {
  if (!auth.isAuthenticated()) return;

  const result = await jobPortal.getSavedJobs();
  if (result.success) {
    const container = document.getElementById('saved-jobs-list');
    container.innerHTML = '';
    
    result.jobs.forEach(job => {
      const jobEl = document.createElement('div');
      jobEl.className = 'saved-job-card';
      jobEl.innerHTML = `
        <h3>${job.title}</h3>
        <p><strong>${job.company}</strong> - ${job.location}</p>
        <p>Status: <strong>${job.status}</strong></p>
        <p>Saved: ${new Date(job.saved_at).toLocaleDateString()}</p>
        <p>Score: <strong>${job.score}/100</strong></p>
        ${job.notes ? `<p><em>${job.notes}</em></p>` : ''}
        <a href="${job.url}" target="_blank">View Job</a>
        <button onclick="removeSavedJob(${job.id})">Remove</button>
      `;
      container.appendChild(jobEl);
    });
  }
}

// Example: Remove saved job
async function removeSavedJob(jobId) {
  const result = await jobPortal.deleteSavedJob(jobId);
  if (result.success) {
    alert('Job removed');
    loadSavedJobs();
  } else {
    alert('Failed to remove: ' + result.error);
  }
}

// Export for use in other modules
window.JobPortalAuth = JobPortalAuth;
window.JobPortalManager = JobPortalManager;
window.auth = auth;
window.jobPortal = jobPortal;
