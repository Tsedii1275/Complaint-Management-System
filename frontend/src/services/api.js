const API_BASE_URL = 'http://localhost:8080';

class ApiService {
  getAttachmentUrl(url) {
    if (!url) return '';
    // If it starts with localhost:8080, replace it with the configured API_BASE_URL
    if (url.startsWith('http://localhost:8080')) {
      return url.replace('http://localhost:8080', API_BASE_URL);
    }
    return url;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
    }
    return headers;
  }

  async post(url, data) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Optional: handle auto-logout or redirect
      }
      // Try to extract server error message
      let serverMsg = '';
      try {
        const errBody = await response.json();
        serverMsg = errBody.error || '';
      } catch (_) {}
      throw new Error(serverMsg || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async get(url) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  // Authentication
  async login(username, password) {
    return this.post('/api/auth/login', { username, password });
  }

  // Submit new complaint
  async submitComplaint(complaintData) {
    return this.post('/api/complaints/start', complaintData);
  }

  // Check complaint status by ticket number
  async checkComplaintStatus(ticketId) {
    return this.get(`/api/complaints/status/${ticketId}`);
  }

  // Staff submits a complaint (possibly already resolved)
  async staffSubmitComplaint(complaintData) {
    return this.post('/api/complaints/staff-submit', complaintData);
  }

  // Staff resolves complaint at First Contact Resolution (no workflow started)
  async fcrResolveComplaint(complaintData) {
    return this.post('/api/complaints/fcr-resolve', complaintData);
  }

  // Get tasks for a specific role/group
  async getTasks(candidateGroup) {
    const params = candidateGroup ? `?candidateGroup=${candidateGroup}` : '';
    return this.get(`/api/tasks${params}`);
  }

  // Get enriched tasks with full details
  async getEnrichedTasks(candidateGroup) {
    const params = candidateGroup ? `?candidateGroup=${candidateGroup}` : '';
    return this.get(`/api/tasks/enriched${params}`);
  }

  // Claim a task
  async claimTask(taskId) {
    // backend now gets userId from token
    return this.post(`/api/tasks/${taskId}/claim`, {});
  }

  // Complete a task with variables
  async completeTask(taskId, variables) {
    return this.post(`/api/tasks/${taskId}/complete`, variables);
  }

  // Get task variables
  async getTaskVariables(taskId) {
    return this.get(`/api/tasks/${taskId}/variables`);
  }

  // Delete a process instance
  async deleteProcessInstance(instanceId) {
    const response = await fetch(`${API_BASE_URL}/api/process/${instanceId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return true;
  }

  // Clear all tasks and process instances from database
  async clearAllTasks() {
    return this.post('/api/process/clear-all', {});
  }

  // Get audit logs with optional filters
  async getAuditLogs(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.action) queryParams.append('action', filters.action);
    if (filters.complaintId) queryParams.append('complaintId', filters.complaintId);
    if (filters.actor) queryParams.append('actor', filters.actor);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);

    const queryString = queryParams.toString();
    const url = `/api/audit/logs${queryString ? `?${queryString}` : ''}`;
    
    return this.get(url);
  }

  // Get all SLA metrics
  async getAllSlaMetrics() {
    return this.get('/api/audit/sla/all');
  }

  // Get SLA report for a specific complaint by process instance ID
  async getSlaReport(processInstanceId) {
    return this.get(`/api/audit/sla/process/${processInstanceId}`);
  }

  // Get SLA report by complaint/ticket ID
  async getSlaByComplaintId(complaintId) {
    return this.get(`/api/audit/sla/complaint/${complaintId}`);
  }

  // Get task time tracking for a process instance
  async getTaskTracking(processInstanceId) {
    return this.get(`/api/audit/sla/tasks/${processInstanceId}`);
  }

  // Claim Task
  async claimTask(taskId) {
    return this.post(`/api/tasks/${taskId}/claim`, {});
  }

  // Get Complaint Stage SLA Timeline
  async getComplaintSlaTimeline(complaintId) {
    return this.get(`/api/complaints/${complaintId}/timeline`);
  }

  // ─── SLA Governance & Configuration ───
  async getSlaConfigs() {
    return this.get('/api/sla/config');
  }

  async updateSlaConfig(id, data) {
    return this.put(`/api/sla/config/${id}`, data);
  }

  async resetSlaConfigs() {
    return this.post('/api/sla/config/reset', {});
  }

  async getHolidays() {
    return this.get('/api/sla/config/holidays');
  }

  async addHoliday(data) {
    return this.post('/api/sla/config/holidays', data);
  }

  async deleteHoliday(id) {
    return this.delete(`/api/sla/config/holidays/${id}`);
  }

  // ─── Service Quality Monitoring ───
  async getSqMonitoringSummary() {
    return this.get('/api/service-quality/monitoring/summary');
  }

  async getSqDepartmentPerformance() {
    return this.get('/api/service-quality/monitoring/departments');
  }

  async getSqBranchPerformance() {
    return this.get('/api/service-quality/monitoring/branches');
  }

  async exportMonthlySlaReport(format = 'excel') {
    return this.downloadFile(`/api/service-quality/reports/export/${format}`, `Monthly_SLA_Governance_Report.${format === 'excel' ? 'xls' : format === 'csv' ? 'csv' : 'txt'}`);
  }

  // Get Districts, Branches, and Departments hierarchy
  async getHierarchy() {
    return this.get('/api/hierarchy');
  }

  // Upload audio file/blob
  async uploadAudio(file, fileName = 'recording.wav') {
    const formData = new FormData();
    formData.append('file', file, fileName);

    const headers = {};
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
    }

    const response = await fetch('http://localhost:8080/api/complaints/upload-audio', {
      method: 'POST',
      headers: headers,
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }

    return response.json();
  }

  // Validate customer feedback token
  async validateCustomerFeedbackToken(token) {
    const response = await fetch(`${API_BASE_URL}/api/customer-feedback/validate?token=${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data;
  }

  // Submit customer resolution feedback (public, no auth needed)
  async submitCustomerFeedback(payload) {
    const response = await fetch(`${API_BASE_URL}/api/customer-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data;
  }

  // Upload evidence file (public, no auth needed)
  async uploadEvidence(file) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const response = await fetch(`${API_BASE_URL}/api/complaints/upload-evidence`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }

    return response.json();
  }

  // Get NBE Reports Data
  async getNbeReportsData() {
    return this.get('/api/complaints/nbe-reports');
  }

  // Update NBE comments/variables
  async updateNbeVariables(instanceId, payload) {
    return this.post(`/api/complaints/${instanceId}/nbe-update`, payload);
  }

  // RCA Module APIs
  async triggerRca(ticketId, processInstanceId, rcaRequired) {
    return this.post('/api/rca/trigger', { ticketId, processInstanceId, rcaRequired });
  }

  async getRcaCases() {
    return this.get('/api/rca/cases');
  }

  async getRcaCaseById(id) {
    return this.get(`/api/rca/cases/${id}`);
  }

  async updateRcaCase(id, payload) {
    const response = await fetch(`${API_BASE_URL}/api/rca/cases/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async updateRcaWhys(id, payload) {
    const response = await fetch(`${API_BASE_URL}/api/rca/cases/${id}/whys`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async addCapaAction(id, payload) {
    return this.post(`/api/rca/cases/${id}/capa`, payload);
  }

  async updateCapaAction(actionId, payload) {
    const response = await fetch(`${API_BASE_URL}/api/rca/capa/${actionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async deleteCapaAction(actionId) {
    const response = await fetch(`${API_BASE_URL}/api/rca/capa/${actionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getRcaAuditLogs(id) {
    return this.get(`/api/rca/cases/${id}/audit-logs`);
  }

  async getRcaAnalytics() {
    return this.get('/api/rca/analytics');
  }

  async getCustomerFeedbackAnalytics() {
    return this.get('/api/customer-feedback/analytics');
  }

  async getCustomerFeedbackDistributions() {
    return this.get('/api/customer-feedback/distributions');
  }

  async getCustomerFeedbackTrends() {
    return this.get('/api/customer-feedback/trends');
  }

  async getCustomerFeedbackList(query = '') {
    return this.get(`/api/customer-feedback/list?query=${encodeURIComponent(query)}`);
  }

  buildQueryString(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    return params.toString();
  }

  async getAnalyticsStats(filters) {
    const query = this.buildQueryString(filters);
    return this.get(`/api/audit/analytics/stats?${query}`);
  }

  async getAnalyticsTrend(interval, filters) {
    const query = this.buildQueryString(filters);
    return this.get(`/api/audit/analytics/trend?interval=${interval}&${query}`);
  }

  async getAnalyticsReports(filters) {
    const query = this.buildQueryString(filters);
    return this.get(`/api/audit/analytics/reports?${query}`);
  }

  async exportAnalyticsData(format, filters) {
    const query = this.buildQueryString(filters);
    const response = await fetch(`${API_BASE_URL}/api/audit/analytics/export?format=${format}&${query}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    return response.blob();
  }

  async downloadFile(endpoint, filename) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    
    // Extract filename from Content-Disposition if present
    let downloadFilename = filename;
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.indexOf('attachment') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        downloadFilename = matches[1].replace(/['"]/g, '');
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}

export default new ApiService();
