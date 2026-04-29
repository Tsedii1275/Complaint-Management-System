import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

function CMD() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    complaintCategory: 'general',
    priorityLevel: 'P2',
    requiresInvestigation: false,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [clearingTasks, setClearingTasks] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await ApiService.getEnrichedTasks();
      // Filter for CMD screening tasks
      const cmdTasks = tasksData.filter(task => 
        task.name && (
          task.name.includes('screens the complaint') || 
          task.name.includes('categorize') ||
          task.name.includes('priority') ||
          task.name.includes('Customer submit') ||
          task.definitionKey === 'FormTask_43' ||
          task.definitionKey === 'FormTask_67'
        )
      );
      setTasks(cmdTasks);
    } catch (error) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSelect = async (task) => {
    setSelectedTask(task);
    setMessage('');
    try {
      // Task is already assigned to "initiator", no need to claim
      await loadTasks(); // Reload tasks to update status
    } catch (error) {
      setMessage('Failed to select task');
      console.error('Error selecting task:', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const clearAllTasks = async () => {
    if (window.confirm('Are you sure you want to clear all tasks? This action cannot be undone.')) {
      setClearingTasks(true);
      try {
        // Get all tasks and complete them
        const allTasks = await ApiService.getTasks();
        const clearPromises = allTasks.map(task => 
          ApiService.completeTask(task.id, {})
        );
        
        await Promise.all(clearPromises);
        setMessage('All tasks cleared successfully!');
        setSelectedTask(null);
        setFormData({ complaintCategory: 'general', priorityLevel: 'P2', requiresInvestigation: false, notes: '' });
        await loadTasks();
        
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage('Failed to clear some tasks');
        console.error('Error clearing tasks:', error);
      } finally {
        setClearingTasks(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      const variables = {
        ...formData,
        complaintCategory: formData.complaintCategory,
        priorityLevel: formData.priorityLevel,
        requiresInvestigation: formData.requiresInvestigation,
        notes: formData.notes || ''
      };

      await ApiService.completeTask(selectedTask.id, variables);
      setMessage('Task completed successfully!');
      
      // Reset form and reload tasks
      setFormData({
        complaintCategory: 'G',
        priorityLevel: 'P2',
        requiresInvestigation: false,
        notes: ''
      });
      setSelectedTask(null);
      await loadTasks();
    } catch (error) {
      setMessage('Failed to complete task');
      console.error('Error completing task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading tasks...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>CMD Officer Tasks</h2>
        <button
          onClick={clearAllTasks}
          disabled={clearingTasks}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: clearingTasks ? 'not-allowed' : 'pointer',
            opacity: clearingTasks ? 0.7 : 1,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title="Clear all active tasks"
        >
          {clearingTasks ? 'Clearing...' : '🗑️ Clear All Tasks'}
        </button>
      </div>
      
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
          color: message.includes('success') ? '#155724' : '#721c24',
          border: `1px solid ${message.includes('success') ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message}
        </div>
      )}

      {!selectedTask ? (
        <div>
          <h3>Available Tasks ({tasks.length})</h3>
          {tasks.length === 0 ? (
            <p>No tasks available</p>
          ) : (
            <div>
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '15px',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <h4>Task: {task.name}</h4>
                  <p><strong>Ticket ID:</strong> {task.complaintId}</p>
                  <p><strong>Customer:</strong> {task.customerName}</p>
                  <p><strong>Priority:</strong> {task.priority}</p>
                  <p><strong>SLA Status:</strong> {task.slaStatus}</p>
                  <p><strong>Created:</strong> {task.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedTask(null)}
            style={{
              marginBottom: '20px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Back to Tasks
          </button>

          <h3>Task Details</h3>
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#f9f9f9'
          }}>
            <h4>Complaint Information</h4>
            <p><strong>Ticket ID:</strong> {selectedTask.complaintId}</p>
            <p><strong>Customer Name:</strong> {selectedTask.customerName}</p>
            <p><strong>Priority:</strong> {selectedTask.priority}</p>
            <p><strong>SLA Status:</strong> {selectedTask.slaStatus}</p>
            
            {selectedTask.variables?.complaint && (
              <div>
                <p><strong>Description:</strong></p>
                <p style={{ fontStyle: 'italic' }}>{selectedTask.variables.complaint.description}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <h4>CMD Screening</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Complaint Category *
              </label>
              <select
                name="complaintCategory"
                value={formData.complaintCategory}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="financial">Financial - Banking Services</option>
                <option value="atm">ATM - Card Services</option>
                <option value="technical">Technical - System Issues</option>
                <option value="account">Account - Management</option>
                <option value="loan">Loan - Credit Services</option>
                <option value="branch">Branch - Customer Service</option>
                <option value="mobile">Mobile - App/Digital Banking</option>
                <option value="fraud">Fraud - Security Issues</option>
                <option value="general">General - Other Issues</option>
              </select>
              <small>Categories determine routing: Financial/ATM/Fraud → Audit Team, Technical/Account/Loan/Mobile/Branch → Work Unit, General → Service Quality</small>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Priority Level *
              </label>
              <select
                name="priorityLevel"
                value={formData.priorityLevel}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="P1">P1 - High Priority</option>
                <option value="P2">P2 - Medium Priority</option>
                <option value="P3">P3 - Low Priority</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  name="requiresInvestigation"
                  checked={formData.requiresInvestigation}
                  onChange={handleFormChange}
                  style={{ marginRight: '8px' }}
                />
                Requires Investigation?
              </label>
              <small>If checked, the complaint will go to Audit Team first. If not, it goes directly to Work Unit.</small>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                CMD Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                rows={3}
                placeholder="Enter screening notes or additional information..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                marginRight: '10px'
              }}
            >
              {isSubmitting ? 'Processing...' : formData.requiresInvestigation ? 'Send to Audit Team' : 'Send to Work Unit'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default CMD;
