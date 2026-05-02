import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Alert, Form, Input, Checkbox, Space, Row, Col } from 'antd';
import { DeleteOutlined, ArrowLeftOutlined, ToolOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';

const { Title, Text, Paragraph } = Typography;

function WorkUnitDashboard() {
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
      const workUnitTasks = tasksData.filter(task => 
        task.name && (
          task.name.includes('resolution') || 
          task.name.includes('work unit') ||
          task.name.includes('investigate') ||
          task.definitionKey === 'FormTask_67'
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
        setFormData({ resolutionDetails: '', actionTaken: '', isSensitive: false });
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

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (values) => {
    // Ant Design onFinish passes form values, not an event
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
      setMessage('Task completed! Resolution details recorded and customer will be notified.');
      
      setFormData({ resolutionDetails: '', actionTaken: '', isSensitive: false });
      setSelectedTask(null);
      await loadTasks();
    } catch (error) {
      setMessage('Failed to complete task');
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
    <DashboardLayout userRole="work-unit">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
              Work Unit Dashboard
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Investigate and resolve technical complaints
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
            {tasks.length === 0 ? (
              <Empty
                description="No tasks available"
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
              icon={<ArrowLeftOutlined />}
              onClick={() => setSelectedTask(null)}
              style={{ marginBottom: '24px' }}
            >
              Back to Tasks
            </Button>

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Card title="Complaint Information" className="form-section">
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
                    {selectedTask.variables?.complaint && (
                      <div>
                        <Text type="secondary">Description:</Text>
                        <br />
                        <Paragraph italic style={{ marginBottom: 0 }}>
                          {selectedTask.variables.complaint.description}
                        </Paragraph>
                      </div>
                    )}
                  </Space>
                </Card>
              </Col>
              
              <Col xs={24} lg={12}>
                <Card title="Work Unit Resolution" className="form-section">
                  <Form onFinish={handleSubmit} layout="vertical">
                    <Form.Item label="Resolution Details" required>
                      <Input.TextArea
                        name="resolutionDetails"
                        value={formData.resolutionDetails}
                        onChange={(e) => handleFormChange(e)}
                        rows={4}
                        placeholder="Enter detailed resolution details..."
                      />
                    </Form.Item>

                    <Form.Item label="Action Taken" required>
                      <Input.TextArea
                        name="actionTaken"
                        value={formData.actionTaken}
                        onChange={(e) => handleFormChange(e)}
                        rows={3}
                        placeholder="Describe actions taken to resolve the complaint..."
                      />
                    </Form.Item>

                    <Form.Item>
                      <Checkbox
                        name="isSensitive"
                        checked={formData.isSensitive}
                        onChange={(e) => handleFormChange({ target: { name: 'isSensitive', value: e.target.checked } })}
                      >
                        Mark as Sensitive Case
                      </Checkbox>
                      <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                        Sensitive cases will be handled by Service Quality Department
                      </small>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={isSubmitting}
                        icon={<ToolOutlined />}
                        size="large"
                        style={{ width: '100%' }}
                      >
                        {isSubmitting ? 'Processing...' : 'Resolve Complaint'}
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default WorkUnitDashboard;
