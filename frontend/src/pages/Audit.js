import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

function Audit() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    investigationFindings: '',
    investigationDecision: 'approved',
    comments: ''
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
      // Filter for Audit investigation tasks
      const auditTasks = tasksData.filter(task => 
        task.name && (
          task.name.includes('Investigation') || 
          task.name.includes('Undertake Investigation')
        )
      );
      setTasks(auditTasks);
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        setFormData({ investigationFindings: '', investigationDecision: 'approved', comments: '' });
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
        investigationFindings: formData.investigationFindings,
        investigationDecision: formData.investigationDecision,
        comments: formData.comments || ''
      };

      await ApiService.completeTask(selectedTask.id, variables);
      setMessage(`Task completed! Complaint ${formData.investigationDecision === 'rejected' ? 'rejected and customer will be notified' : 'approved and sent to Work Unit'}.`);
      
      // Reset form and reload tasks
      setFormData({
        investigationFindings: '',
        investigationDecision: 'approved',
        comments: ''
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
        <h2>Audit Team Tasks</h2>
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
            
            {selectedTask.variables?.notes && (
              <div>
                <p><strong>CMD Notes:</strong></p>
                <p style={{ fontStyle: 'italic' }}>{selectedTask.variables.notes}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <h4>Investigation</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Investigation Findings *
              </label>
              <textarea
                name="investigationFindings"
                value={formData.investigationFindings}
                onChange={handleFormChange}
                required
                rows={4}
                placeholder="Describe your investigation findings in detail..."
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
                Investigation Decision *
              </label>
              <select
                name="investigationDecision"
                value={formData.investigationDecision}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="approved">Approved - Send to Work Unit</option>
                <option value="rejected">Rejected - Notify Customer</option>
              </select>
              <small>Rejected complaints will be closed and the customer will be notified.</small>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Investigation Comments
              </label>
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleFormChange}
                rows={3}
                placeholder="Additional comments or recommendations..."
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
                backgroundColor: formData.investigationDecision === 'rejected' ? '#dc3545' : '#007bff',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                marginRight: '10px'
              }}
            >
              {isSubmitting ? 'Processing...' : formData.investigationDecision === 'rejected' ? 'Reject & Close' : 'Approve & Send to Work Unit'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Audit;
