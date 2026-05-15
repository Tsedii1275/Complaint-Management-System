import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Alert, Form, Input, Checkbox, Space, Row, Col, Modal, Select } from 'antd';
import { DeleteOutlined, ArrowLeftOutlined, CheckCircleOutlined, ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';

const { Title, Text, Paragraph } = Typography;

function BranchStaffDashboard() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    isFCR: false,
    fcrComments: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [clearingTasks, setClearingTasks] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    customerName: '',
    email: '',
    phone: '',
    accountNumber: '',
    complaintCategory: 'general',
    complaintDescription: '',
    isFCR: false,
    fcrComments: ''
  });
  const [modalForm] = Form.useForm();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await ApiService.getEnrichedTasks();
      const branchTasks = tasksData.filter(task => 
        task.name && (
          task.name.includes('First Contact Resolution') || 
          task.name.includes('FIrst Contact Resolution') ||
          task.name.includes('Register Complaint') ||
          task.definitionKey === 'FormTask_72'
        )
      );
      setTasks(branchTasks);
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
        // Use a Set to collect unique processInstanceIds to avoid redundant calls
        const uniqueProcessIds = [...new Set(allTasks.map(task => task.processInstanceId))];
        
        const clearPromises = uniqueProcessIds.map(id => 
          ApiService.deleteProcessInstance(id)
        );
        
        await Promise.all(clearPromises);
        setMessage('All tasks cleared successfully!');
        setSelectedTask(null);
        setFormData({ isFCR: false, fcrComments: '' });
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
        isFCR: formData.isFCR,
        fcrComments: formData.fcrComments || ''
      };

      await ApiService.completeTask(selectedTask.id, variables);
      
      if (formData.isFCR) {
        setMessage('Task completed! Complaint resolved and customer will be notified.');
      } else {
        setMessage('Task completed! Complaint has been escalated to CMD for screening.');
      }
      
      setFormData({ isFCR: false, fcrComments: '' });
      setSelectedTask(null);
      await loadTasks();
    } catch (error) {
      setMessage('Failed to complete task');
      console.error('Error completing task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffSubmit = async () => {
    try {
      const values = await modalForm.validateFields();
      setIsSubmitting(true);
      
      let phone = values.phone;
      if (phone.startsWith('09')) phone = '+251' + phone.substring(1);
      else if (phone.startsWith('9')) phone = '+251' + phone;

      const payload = {
        customer: {
          name: values.customerName,
          email: values.email,
          phone: phone,
          accountNumber: values.accountNumber || ''
        },
        complaint: {
          channel: 'Branch',
          category: values.complaintCategory,
          description: values.complaintDescription
        },
        isFCR: values.isFCR,
        fcrComments: values.fcrComments || ''
      };

      await ApiService.staffSubmitComplaint(payload);
      
      setMessage(values.isFCR ? 'Complaint registered and resolved successfully!' : 'Complaint registered successfully and sent to CMD.');
      setIsModalOpen(false);
      modalForm.resetFields();
      setStaffFormData({
        customerName: '',
        email: '',
        phone: '',
        accountNumber: '',
        complaintCategory: 'general',
        complaintDescription: '',
        isFCR: false,
        fcrComments: ''
      });
      
      // Small delay to allow Flowable to finish the transaction and advance the process
      setTimeout(() => {
        loadTasks();
      }, 1000);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      if (!error.errorFields) {
        setMessage('Failed to submit complaint');
      }
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
    <DashboardLayout userRole="branch-staff">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
              Branch Staff Dashboard
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Manage and resolve customer complaints
            </Text>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
              size="large"
            >
              Fill Complaint
            </Button>
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
          </Space>
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
                <Card title="Branch Resolution" className="form-section">
                  <Form onFinish={handleSubmit} layout="vertical">
                    <Form.Item>
                      <Checkbox
                        name="isFCR"
                        checked={formData.isFCR}
                        onChange={(e) => handleFormChange({ target: { name: 'isFCR', value: e.target.checked } })}
                      >
                        Resolved at first contact?
                      </Checkbox>
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          <ExclamationCircleOutlined style={{ marginRight: '4px' }} />
                          If checked, the complaint will be closed. If not, it will be sent to CMD.
                        </Text>
                      </div>
                    </Form.Item>

                    <Form.Item label="FCR Comments (optional)">
                      <Input.TextArea
                        name="fcrComments"
                        value={formData.fcrComments}
                        onChange={(e) => handleFormChange(e)}
                        rows={4}
                        placeholder="Enter resolution details or comments..."
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={isSubmitting}
                        icon={formData.isFCR ? <CheckCircleOutlined /> : null}
                        size="large"
                        style={{ width: '100%' }}
                      >
                        {isSubmitting ? 'Processing...' : formData.isFCR ? 'Resolve and Close' : 'Send to CMD'}
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        <Modal
          title={<Title level={3} style={{ color: BRAND_COLORS.primary, margin: 0 }}>Register New Complaint</Title>}
          open={isModalOpen}
          onOk={handleStaffSubmit}
          onCancel={() => setIsModalOpen(false)}
          confirmLoading={isSubmitting}
          okText={staffFormData.isFCR ? "Register and Resolve" : "Register Complaint"}
          width={700}
          destroyOnClose
        >
          <Form
            form={modalForm}
            layout="vertical"
            initialValues={staffFormData}
            onValuesChange={(changed, all) => setStaffFormData(all)}
            style={{ marginTop: '20px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="customerName" label="Customer Name" rules={[{ required: true }]}>
                  <Input placeholder="Full Name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                  <Input placeholder="Email Address" />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
                  <Input placeholder="+2519XXXXXXXX" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="accountNumber" label="Account Number">
                  <Input placeholder="13-digit account number" maxLength={13} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="complaintCategory" label="Category" rules={[{ required: true }]}>
              <Select placeholder="Select category">
                <Select.Option value="financial">Financial - Banking Services</Select.Option>
                <Select.Option value="atm">ATM - Card Services</Select.Option>
                <Select.Option value="technical">Technical - System Issues</Select.Option>
                <Select.Option value="account">Account - Management</Select.Option>
                <Select.Option value="loan">Loan - Credit Services</Select.Option>
                <Select.Option value="branch">Branch - Customer Service</Select.Option>
                <Select.Option value="mobile">Mobile - App/Digital Banking</Select.Option>
                <Select.Option value="fraud">Fraud - Security Issues</Select.Option>
                <Select.Option value="general">General - Other Issues</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="complaintDescription" label="Complaint Description" rules={[{ required: true }]}>
              <Input.TextArea rows={4} placeholder="Detailed description of the complaint" />
            </Form.Item>

            <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '24px' }}>
              <Form.Item name="isFCR" valuePropName="checked" style={{ marginBottom: staffFormData.isFCR ? '16px' : 0 }}>
                <Checkbox>
                  <strong>Resolved at first contact (FCR)?</strong>
                </Checkbox>
              </Form.Item>
              
              {staffFormData.isFCR && (
                <Form.Item name="fcrComments" label="Resolution Comments" rules={[{ required: true, message: 'Please provide resolution details' }]}>
                  <Input.TextArea rows={3} placeholder="How was this resolved?" />
                </Form.Item>
              )}
            </div>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default BranchStaffDashboard;
