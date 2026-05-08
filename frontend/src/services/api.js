const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class ApiService {
  async post(url, data) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async get(url) {
    const response = await fetch(`${API_BASE_URL}${url}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  // Submit new complaint
  async submitComplaint(complaintData) {
    return this.post('/api/complaints/start', complaintData);
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
  async claimTask(taskId, userId) {
    return this.post(`/api/tasks/${taskId}/claim`, { userId });
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
}

export default new ApiService();
