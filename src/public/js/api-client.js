/**
 * Centralized API Client for AttendanceMS
 * Handles all HTTP requests with error handling, retries, and caching
 */

class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.requestQueue = [];
    this.isOnline = navigator.onLine;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Generic request method
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    // Check cache for GET requests
    if (options.method === 'GET' || !options.method) {
      const cached = this.getFromCache(url);
      if (cached) return cached;
    }

    // If offline, queue the request
    if (!this.isOnline && options.method !== 'GET') {
      return this.queueRequest(url, config);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      
      // Cache GET requests
      if (options.method === 'GET' || !options.method) {
        this.setCache(url, data);
      }

      return { success: true, data };
    } catch (error) {
      console.error('API Request failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Handle API errors
   */
  async handleError(response) {
    let errorMessage = 'An error occurred';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    return error;
  }

  /**
   * Queue request for offline processing
   */
  queueRequest(url, config) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ url, config, resolve, reject });
      this.showOfflineNotification();
    });
  }

  /**
   * Process queued requests when back online
   */
  async processQueue() {
    while (this.requestQueue.length > 0) {
      const { url, config, resolve, reject } = this.requestQueue.shift();
      
      try {
        const response = await fetch(url, config);
        const data = await response.json();
        resolve({ success: true, data });
      } catch (error) {
        reject(error);
      }
    }
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Show offline notification
   */
  showOfflineNotification() {
    if (window.showToast) {
      window.showToast('You are offline. Changes will be synced when connection is restored.', 'warning');
    }
  }
}

// Create global API client instance
const api = new APIClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

// API Methods for common operations
const AttendanceAPI = {
  // Dashboard
  getDashboardData: () => api.get('/api/teacher-dashboard'),
  getQuickStats: () => api.get('/api/quick-stats'),
  getTeacherTotals: () => api.get('/api/teacher/totals'),
  getTodaySummary: () => api.get('/api/teacher/today'),
  getTrend: (days = 30) => api.get('/api/teacher/trend', { days }),

  // Classes
  getClassSummary: (classId, from, to) => api.get(`/api/class/${classId}/summary`, { from, to }),
  getClassTrend: (classId, days = 30) => api.get(`/api/class/${classId}/trend`, { days }),
  getStudentPercentages: (classId, from, to) => api.get(`/api/class/${classId}/student-percentages`, { from, to }),

  // Attendance
  markAttendance: (classId, data) => api.post(`/class/${classId}/attendance`, data),
  markDailyAttendance: (classId, data) => api.post(`/class/${classId}/daily-attendance`, data),
  getRealtimeAttendance: (classId) => api.get(`/api/realtime-attendance/${classId}`),

  // Analytics
  getHeatmap: (classId, startDate, endDate) => 
    api.get(`/api/analytics/heatmap/${classId}`, { startDate, endDate }),
  getTrends: (classId, period = 30) => 
    api.get(`/api/analytics/trends/${classId}`, { period }),
  getComparative: (period = 30) => 
    api.get('/api/analytics/comparative', { period }),
  getAttendanceHeatmap: (period = 7) => 
    api.get('/api/attendance-heatmap', { period }),

  // Notifications
  getNotifications: () => api.get('/notifications'),
  markNotificationRead: (id) => api.post(`/notifications/${id}/read`),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),

  // Reports
  generateReport: (data) => api.post('/reports/generate', data),
  getClassReport: (classId, params) => api.get(`/reports/class/${classId}`, params),
  getStudentReport: (studentId, params) => api.get(`/reports/student/${studentId}`, params),

  // Students
  getStudents: (classId) => api.get(`/class/${classId}/students`),
  addStudent: (classId, data) => api.post(`/class/${classId}/student`, data),
  updateStudent: (studentId, data) => api.put(`/student/${studentId}`, data),
  deleteStudent: (studentId) => api.delete(`/student/${studentId}`),

  // Profile
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  uploadProfilePhoto: (formData) => {
    return fetch('/profile/photo', {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },
};

// Make available globally
window.api = api;
window.AttendanceAPI = AttendanceAPI;
