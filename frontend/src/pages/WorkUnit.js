import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

function WorkUnit() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    resolutionDetails: '',
    actionTaken: '',
    isSensitive: false
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
      // Filter for Work Unit resolution tasks
      const workUnitTasks = tasksData.filter(task => 
        task.name && (
          task.name.includes('Resolution') || 
          task.name.includes('Second Level Resolution')
        )
      );
      setTasks(workUnitTasks);
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
        setFormData({ resolutionDetails: '', actionTaken: '', isSensitive: false });
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
        resolutionDetails: formData.resolutionDetails,
        actionTaken: formData.actionTaken,
        isSensitive: formData.isSensitive
      };

      await ApiService.completeTask(selectedTask.id, variables);
      setMessage(`Resolution completed! Customer will be notified by ${formData.isSensitive ? 'Service Quality Department' : 'CMD'}.`);
      
      // Reset form and reload tasks
      setFormData({
        resolutionDetails: '',
        actionTaken: '',
        isSensitive: false
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
        <h2>Work Unit Tasks</h2>
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
            
            {selectedTask.variables?.investigationFindings && (
              <div>
                <p><strong>Investigation Findings:</strong></p>
                <p style={{ fontStyle: 'italic' }}>{selectedTask.variables.investigationFindings}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <h4>Resolution Details</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Resolution Details *
              </label>
              <textarea
                name="resolutionDetails"
                value={formData.resolutionDetails}
                onChange={handleFormChange}
                required
                rows={4}
                placeholder="Describe the resolution in detail..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Action Taken *
              </label>
              <textarea
                name="actionTaken"
                value={formData.actionTaken}
                onChange={handleFormChange}
                required
                rows={3}
                placeholder="Describe the specific actions taken to resolve the complaint..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  name="isSensitive"
                  checked={formData.isSensitive}
                  onChange={handleFormChange}
                  style={{ marginRight: '8px' }}
                />
                Mark as Sensitive?
              </label>
              <small>If checked, Service Quality Department will handle customer notification. If not, CMD will notify the customer.</small>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                marginRight: '10px'
              }}
            >
              {isSubmitting ? 'Processing...' : 'Complete Resolution'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default WorkUnit;
