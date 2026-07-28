import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Alert, Space, Row, Col, Input, message, Modal } from 'antd';
import { SendOutlined, ArrowLeftOutlined, BellOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import TaskCard from '../components/TaskCard';
import TaskTable from '../components/TaskTable';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

function ServiceQualityDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
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
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load pending customer notification tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    const customerName = task.customerName || 'Customer';
    const complaintId = task.complaintId || 'Case';
    const defaultMsg = `Dear ${customerName},\n\nYour complaint ${complaintId} has been processed and resolved.\n\nWe hope the resolution meets your expectations. Thank you for choosing Dashen Bank.\n\nBest regards,\nService Quality & Customer Experience Department`;
    setNotificationMessage(defaultMsg);
  };

  const handleSendResolution = async () => {
    if (!selectedTask) return;

    setIsSubmitting(true);
    try {
      const variables = {
        customNotificationMessage: notificationMessage,
        notificationSentAt: new Date().toISOString(),
        notificationSentBy: 'Service Quality'
      };
      await ApiService.completeTask(selectedTask.id, variables);
      message.success('Resolution notification sent to customer successfully!');
      setSelectedTask(null);
      await loadTasks();
    } catch (err) {
      console.error('Error completing task:', err);
      message.error('Failed to send resolution notification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="service-quality">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Card loading={true} style={{ width: '100%', maxWidth: '600px' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="service-quality">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        
        {/* Officer Greeting */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
            Hello, {user?.fullName || user?.username || 'Service Quality Officer'}
          </Title>
          <Text type="secondary" style={{ fontSize: '15px' }}>
            Customer response & final resolution notifications queue
          </Text>
        </div>

        {error && (
          <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: '24px' }} />
        )}

        {!selectedTask ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <Title level={4} style={{ margin: 0 }}>
                Customer Notification Tasks ({tasks.length})
              </Title>
            </div>

            {tasks.length === 0 ? (
              <Empty
                description="No assigned customer notification tasks pending"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ marginTop: '60px' }}
              />
            ) : (
              <TaskTable
                tasks={tasks}
                onSelectTask={handleTaskSelect}
                onTaskClaimed={loadTasks}
              />
            )}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedTask(null)} style={{ borderRadius: '6px' }} />
            </div>

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={13}>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      Complaint details
                    </Text>
                    <Tag color="blue" style={{ borderRadius: '6px', fontWeight: 600, margin: 0 }}>
                      {selectedTask.complaintId}
                    </Tag>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Ticket ID</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>{selectedTask.complaintId}</Text>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Customer Name</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>{selectedTask.customerName}</Text>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Priority</Text>
                      <Tag color={selectedTask.priority === 'HIGHLY_SENSITIVE' ? 'red' : selectedTask.priority === 'SENSITIVE' ? 'orange' : 'green'} style={{ margin: 0, fontWeight: 600 }}>
                        {selectedTask.priority || 'SENSITIVE'}
                      </Tag>
                    </div>

                    {selectedTask.variables?.resolutionDetails && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Resolution Details</Text>
                        <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500, textAlign: 'right', maxWidth: '280px' }}>
                          {selectedTask.variables.resolutionDetails}
                        </Text>
                      </div>
                    )}

                    {selectedTask.variables?.actionTaken && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Action Taken</Text>
                        <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500, textAlign: 'right', maxWidth: '280px' }}>
                          {selectedTask.variables.actionTaken}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              </Col>
              
              <Col xs={24} lg={11}>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      Send Final Customer Notification
                    </Text>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <Alert
                      message="Customer Feedback Link Included"
                      description="The customer survey feedback link (http://localhost:3000/customer-feedback?token=...) is automatically appended to this notification message upon sending."
                      type="info"
                      showIcon
                      style={{ marginBottom: '16px', borderRadius: '8px' }}
                    />

                    <div style={{ marginBottom: '16px' }}>
                      <Text style={{ color: '#475569', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                        Official Message to Customer:
                      </Text>
                      <Input.TextArea
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        rows={7}
                        style={{ fontSize: '14px', lineHeight: '1.5', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    <Button
                      type="primary"
                      onClick={handleSendResolution}
                      loading={isSubmitting}
                      icon={<SendOutlined />}
                      size="large"
                      style={{ width: '100%', borderRadius: '8px', height: '44px', fontWeight: 600 }}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Resolution Notification'}
                    </Button>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ServiceQualityDashboard;
