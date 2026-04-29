import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Alert, Space, Row, Col } from 'antd';
import { DeleteOutlined, SendOutlined, SafetyOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';

const { Title, Text, Paragraph } = Typography;

function ServiceQualityDashboard() {
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
      const serviceQualityTasks = tasksData.filter(task => 
        task.name && (
          task.name.includes('Notify Customer') || 
          task.name.includes('explanation') ||
          task.name.includes('notification') ||
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

  const clearAllTasks = async () => {
    if (window.confirm('Are you sure you want to clear all tasks? This action cannot be undone.')) {
      setClearingTasks(true);
      try {
        const allTasks = await ApiService.getTasks();
        const clearPromises = allTasks.map(task => 
          ApiService.completeTask(task.id, {})
        );
        
        await Promise.all(clearPromises);
        setMessage('All tasks cleared successfully!');
        setSelectedTask(null);
        await loadTasks();
        
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage('Failed to clear some tasks');
        console.error('Error clearing tasks:', error);
      } finally {
        setClearingTasks(false);
      }
    }
  };

  const handleTaskSelect = async (task) => {
    setSelectedTask(task);
    setMessage('');
    try {
      await loadTasks();
    } catch (error) {
      setMessage('Failed to select task');
      console.error('Error selecting task:', error);
    }
  };

  const handleSendResolution = async () => {
    if (!selectedTask) return;

    setIsSubmitting(true);
    setMessage('');

    try {
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      <Card loading={true} style={{ width: '100%', maxWidth: '600px' }} />
    </div>
  );
  
  if (error) return (
    <Alert
      message="Error"
      description={error}
      type="error"
      showIcon
      style={{ margin: '20px' }}
    />
  );

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'p1': return 'red';
      case 'p2': return 'orange';
      case 'p3': return 'green';
      default: return 'blue';
    }
  };

  const getSlaStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'overdue': return 'error';
      case 'approaching': return 'warning';
      default: return 'success';
    }
  };

  return (
    <DashboardLayout userRole="service-quality">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
              Service Quality Dashboard
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Send customer notifications and ensure service quality
            </Text>
          </div>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={clearAllTasks}
            disabled={clearingTasks}
            loading={clearingTasks}
            size="large"
          >
            Clear All Tasks
          </Button>
        </div>
        
        {message && (
          <Alert
            message={message.includes('success') ? 'Success' : 'Information'}
            description={message}
            type={message.includes('success') ? 'success' : 'info'}
            showIcon
            closable
            style={{ marginBottom: '24px' }}
            onClose={() => setMessage('')}
          />
        )}

        {!selectedTask ? (
          <div>
            <Title level={4} style={{ marginBottom: '24px' }}>
              Customer Notifications ({tasks.length})
            </Title>
            {tasks.length === 0 ? (
              <Empty
                description="No notifications pending"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ marginTop: '60px' }}
              />
            ) : (
              <Row gutter={[24, 24]}>
                {tasks.map(task => (
                  <Col xs={24} sm={24} md={12} lg={8} xl={6} key={task.id}>
                    <Card
                      hoverable
                      className={`task-card task-priority-${getPriorityColor(task.priority)}`}
                      onClick={() => handleTaskSelect(task)}
                      size="small"
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: '14px' }}>
                            {task.name}
                          </Text>
                          <Tag color={getSlaStatusColor(task.slaStatus)}>
                            {task.slaStatus}
                          </Tag>
                        </div>
                      }
                      extra={
                        <Tag color={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Tag>
                      }
                    >
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <Text type="secondary">Ticket ID:</Text>
                          <br />
                          <Text code>{task.complaintId}</Text>
                        </div>
                        <div>
                          <Text type="secondary">Customer:</Text>
                          <br />
                          <Text>{task.customerName}</Text>
                        </div>
                        <div>
                          <Text type="secondary">Created:</Text>
                          <br />
                          <Text>{new Date(task.createdAt).toLocaleDateString()}</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        ) : (
          <div>
            <Button
              icon={<DeleteOutlined />}
              onClick={() => setSelectedTask(null)}
              style={{ marginBottom: '24px' }}
            >
              Back to Notifications
            </Button>

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Card title="Notification Details" className="form-section">
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Ticket ID:</Text>
                      <br />
                      <Text code>{selectedTask.complaintId}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Customer Name:</Text>
                      <br />
                      <Text>{selectedTask.customerName}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Priority:</Text>
                      <br />
                      <Tag color={getPriorityColor(selectedTask.priority)}>
                        {selectedTask.priority}
                      </Tag>
                    </div>
                    <div>
                      <Text type="secondary">SLA Status:</Text>
                      <br />
                      <Tag color={getSlaStatusColor(selectedTask.slaStatus)}>
                        {selectedTask.slaStatus}
                      </Tag>
                    </div>
                    <div>
                      <Text type="secondary">Notification Type:</Text>
                      <br />
                      <Text>{selectedTask.name}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
              
              <Col xs={24} lg={12}>
                <Card title="Send Customer Notification" className="form-section">
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Ready to send customer notification?</Text>
                      <br />
                      <Text type="secondary" style={{ marginTop: '8px' }}>
                        This will send a professional notification to the customer with the resolution details.
                      </Text>
                    </div>

                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <Text type="secondary" style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                        Notification Preview:
                      </Text>
                      <Text style={{ fontSize: '14px', lineHeight: '1.5' }}>
                        Dear {selectedTask.customerName},<br /><br />
                        Your complaint {selectedTask.complaintId} has been processed and resolved.<br /><br />
                        We hope the resolution meets your expectations. Thank you for your patience.<br /><br />
                        Best regards,<br />
                        Customer Service Team
                      </Text>
                    </div>

                    <Button
                      type="primary"
                      onClick={handleSendResolution}
                      loading={isSubmitting}
                      icon={<SendOutlined />}
                      size="large"
                      style={{ width: '100%' }}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Notification'}
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ServiceQualityDashboard;
