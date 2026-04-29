import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

function ServiceQuality() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      // Filter for Service Quality notification tasks
      const serviceQualityTasks = tasksData.filter(task => 
        task.name && (
          task.name.includes('Notify Customer') || 
          task.name.includes('explanation') ||
          task.name.includes('Notify Customer with explanation') ||
          task.definitionKey === 'ServiceTask_65'
        )
      );
      setTasks(serviceQualityTasks);
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

  const handleSendResolution = async () => {
    if (!selectedTask) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      // Complete the task - no variables needed for notification step
      await ApiService.completeTask(selectedTask.id, {});
      setMessage('Resolution notification sent to customer successfully!');
      
      setSelectedTask(null);
      await loadTasks();
    } catch (error) {
      setMessage('Failed to send resolution notification');
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
        <h2>Service Quality Department</h2>
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
          <h3>Customer Notifications ({tasks.length})</h3>
          {tasks.length === 0 ? (
            <p>No notifications pending</p>
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
                  <p style={{ color: '#28a745', fontWeight: 'bold' }}>
                    Ready to send resolution notification
                  </p>
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
            ← Back to Notifications
          </button>

          <h3>Resolution Notification</h3>
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
                <p><strong>Original Complaint:</strong></p>
                <p style={{ fontStyle: 'italic' }}>{selectedTask.variables.complaint.description}</p>
              </div>
            )}
            
            {selectedTask.variables?.resolutionDetails && (
              <div>
                <p><strong>Resolution Details:</strong></p>
                <p style={{ fontStyle: 'italic', backgroundColor: '#e8f5e8', padding: '10px', borderRadius: '4px' }}>
                  {selectedTask.variables.resolutionDetails}
                </p>
              </div>
            )}
            
            {selectedTask.variables?.actionTaken && (
              <div>
                <p><strong>Action Taken:</strong></p>
                <p style={{ fontStyle: 'italic', backgroundColor: '#e8f5e8', padding: '10px', borderRadius: '4px' }}>
                  {selectedTask.variables.actionTaken}
                </p>
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <h4 style={{ color: '#856404', marginTop: 0 }}>Notification Details</h4>
            <p style={{ color: '#856404' }}>
              This is a <strong>sensitive case</strong> that requires Service Quality Department notification.
            </p>
            <p style={{ color: '#856404' }}>
              The customer will receive an email and SMS notification with the resolution details.
            </p>
          </div>

          <button
            onClick={handleSendResolution}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isSubmitting ? 'Sending...' : 'Send Resolution to Customer'}
          </button>

          <p style={{ marginTop: '15px', color: '#6c757d', fontSize: '14px' }}>
            Clicking this button will send the resolution notification to the customer and close the complaint.
          </p>
        </div>
      )}
    </div>
  );
}

export default ServiceQuality;
