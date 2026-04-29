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
    return this.post(`/api/tasks/${taskId}/complete`, { variables });
  }

  // Get task variables
  async getTaskVariables(taskId) {
    return this.get(`/api/tasks/${taskId}/variables`);
  }
}

export default new ApiService();
