const API_BASE_URL = 'http://localhost:8080';

class ApiService {
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
      throw new Error(`HTTP error! status: ${response.status}`);
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

  // Staff submits a complaint (possibly already resolved)
  async staffSubmitComplaint(complaintData) {
    return this.post('/api/complaints/staff-submit', complaintData);
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
}

export default new ApiService();
