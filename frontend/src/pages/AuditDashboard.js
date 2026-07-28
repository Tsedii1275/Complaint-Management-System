import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Alert, Form, Input, Space, Row, Col, Tabs, Table, Select } from 'antd';
import { DeleteOutlined, ArrowLeftOutlined, AuditOutlined, FileAddOutlined, PaperClipOutlined, DownloadOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import TaskCard from '../components/TaskCard';
import TaskTable from '../components/TaskTable';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

function AuditDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slaMetrics, setSlaMetrics] = useState([]);
  const [activeTab, setActiveTab] = useState('all_tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState('');
  const [formData, setFormData] = useState({
    auditJustification: '',
    auditFindings: '',
    auditAttachment: '',
    auditAttachmentName: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [clearingTasks, setClearingTasks] = useState(false);

  useEffect(() => {
    loadTasks(true);
    fetchSlaMetrics();

    const interval = setInterval(() => {
      loadTasks(false);
      fetchSlaMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchSlaMetrics = async () => {
    try {
      const data = await ApiService.getAllSlaMetrics();
      setSlaMetrics(data || []);
    } catch (err) {
      console.error('Failed to load SLA metrics:', err);
    }
  };

  const loadTasks = async (showLoading = false) => {
    try {
      if (showLoading === true) setLoading(true);
      const tasksData = await ApiService.getEnrichedTasks();
      const auditTasks = tasksData.filter(task =>
        task.definitionKey === 'FormTask_48'
      );
      setTasks(auditTasks);
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
        await ApiService.clearAllTasks();
        setMessage('All tasks and SLA records cleared successfully!');
        setSelectedTask(null);
        setFormData({ auditJustification: '', auditFindings: '', auditAttachment: '', auditAttachmentName: '' });
        setSelectedFile(null);
        await loadTasks(true);

        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage('Failed to clear all tasks');
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
      await loadTasks(false);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFormData(prev => ({
        ...prev,
        auditAttachmentName: file.name
      }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;

    if (!formData.auditJustification.trim()) {
      setMessage('Error: Investigation Justification is required.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      let uploadedUrl = formData.auditAttachment;
      let uploadedName = formData.auditAttachmentName;

      if (selectedFile) {
        try {
          const uploadResult = await ApiService.uploadEvidence(selectedFile);
          uploadedUrl = uploadResult.url;
          uploadedName = uploadResult.fileName;
        } catch (uploadError) {
          setMessage('Failed to upload attachment: ' + uploadError.message);
          setIsSubmitting(false);
          return;
        }
      }

      const variables = {
        auditJustification: formData.auditJustification,
        auditFindings: formData.auditFindings,
        auditAttachment: uploadedUrl,
        auditAttachmentName: uploadedName,
        investigationDecision: 'approved'
      };

      await ApiService.completeTask(selectedTask.id, variables);
      setMessage('Task completed! Investigation report submitted to Chief Committee.');

      setFormData({ auditJustification: '', auditFindings: '', auditAttachment: '', auditAttachmentName: '' });
      setSelectedFile(null);
      setSelectedTask(null);
      await loadTasks(true);
    } catch (error) {
      setMessage(error.message || 'Failed to complete task');
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
    switch (priority?.toUpperCase()) {
      case 'P1': return 'red';
      case 'P2': return 'orange';
      case 'P3': return 'green';
      case 'P4': return 'blue';
      default: return 'blue';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'P1': return 'Critical';
      case 'P2': return 'High';
      case 'P3': return 'Medium';
      case 'P4': return 'Low';
      default: return priority || 'N/A';
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
    <DashboardLayout userRole="audit">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
              Hello, {user?.fullName || user?.username || ''}
            </Title>
            <Text type="secondary" style={{ fontSize: '15px' }}>
              Investigate &amp; audit for compliance
            </Text>
          </div>
          <Button
            danger
            type="primary"
            icon={<DeleteOutlined />}
            onClick={clearAllTasks}
            disabled={clearingTasks}
            loading={clearingTasks}
            style={{ borderRadius: '6px' }}
          >
            Clear All Tasks
          </Button>
        </div>


        {message && (
          <Alert
            message={message.includes('success') || message.includes('completed') ? 'Success' : 'Information'}
            description={message}
            type={message.includes('success') || message.includes('completed') ? 'success' : 'info'}
            showIcon
            closable
            style={{ marginBottom: '24px' }}
            onClose={() => setMessage('')}
          />
        )}

        {!selectedTask ? (
          <div>
            {/* Search Input Bar (Above Tabs) */}
            <div style={{ marginBottom: '16px' }}>
              <Input
                className="pill-search-input"
                placeholder="Search by Ticket ID, Customer, Description..."
                prefix={<SearchOutlined style={{ color: '#475569', fontSize: '16px' }} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                style={{ width: '280px' }}
              />
            </div>

            {/* Operational Task Tabs (Below Search Bar) */}
            {(() => {
              const myTasksList = tasks.filter(t => t.assignee === user?.username || t.assignee === user?.name || t.claimedBy === user?.username);
              const completedMetrics = slaMetrics.filter(m => (m.status || '').toUpperCase() === 'CLOSED');

              return (
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  style={{ marginBottom: '16px' }}
                >
                  <Tabs.TabPane tab={`All Tasks (${tasks.length})`} key="all_tasks" />
                  <Tabs.TabPane tab={`My Tasks (${myTasksList.length})`} key="my_tasks" />
                  <Tabs.TabPane tab={`Completed Tasks (${completedMetrics.length})`} key="completed_tasks" />
                  <Tabs.TabPane tab={`SLA Status (${slaMetrics.length})`} key="sla_status" />
                </Tabs>
              );
            })()}

            {(() => {
              const query = searchQuery.toLowerCase().trim();

              if (activeTab === 'completed_tasks') {
                const completedList = slaMetrics.filter(m => (m.status || '').toUpperCase() === 'CLOSED').filter(m => {
                  return !query ||
                    (m.complaintId || '').toLowerCase().includes(query) ||
                    (m.customerName || '').toLowerCase().includes(query) ||
                    (m.branch || '').toLowerCase().includes(query);
                });

                return (
                  <Table
                    dataSource={completedList}
                    rowKey="id"
                    pagination={{
                      defaultCurrent: 1,
                      pageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: [10, 20, 50, 100],
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} completed tasks`
                    }}
                    columns={[
                      { title: 'Ticket ID', dataIndex: 'complaintId', key: 'complaintId', render: t => <Text strong style={{ color: BRAND_COLORS.primary, fontFamily: 'monospace' }}>{t}</Text> },
                      { title: 'Customer Name', dataIndex: 'customerName', key: 'customerName' },
                      { title: 'Category', dataIndex: 'complaintCategory', key: 'complaintCategory', render: c => <Tag color="blue">{c}</Tag> },
                      { title: 'Branch', dataIndex: 'branch', key: 'branch' },
                      { title: 'Status', dataIndex: 'status', key: 'status', render: st => <Tag color="default">{st || 'CLOSED'}</Tag> },
                      { title: 'SLA Status', dataIndex: 'slaStatus', key: 'slaStatus', render: s => <Tag color={s === 'BREACHED' ? 'red' : 'green'}>{s || 'ON_TRACK'}</Tag> }
                    ]}
                  />
                );
              }

              if (activeTab === 'sla_status') {
                const slaList = slaMetrics.filter(m => {
                  return !query ||
                    (m.complaintId || '').toLowerCase().includes(query) ||
                    (m.customerName || '').toLowerCase().includes(query) ||
                    (m.branch || '').toLowerCase().includes(query);
                });

                return (
                  <Table
                    dataSource={slaList}
                    rowKey="id"
                    pagination={{
                      defaultCurrent: 1,
                      pageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: [10, 20, 50, 100],
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} SLA records`
                    }}
                    columns={[
                      { title: 'Ticket ID', dataIndex: 'complaintId', key: 'complaintId', render: t => <Text strong style={{ color: BRAND_COLORS.primary, fontFamily: 'monospace' }}>{t}</Text> },
                      { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
                      { title: 'Category', dataIndex: 'complaintCategory', key: 'complaintCategory' },
                      { title: 'Branch', dataIndex: 'branch', key: 'branch' },
                      { title: 'SLA Status', dataIndex: 'slaStatus', key: 'slaStatus', render: s => <Tag color={s === 'BREACHED' ? 'red' : s === 'APPROACHING' ? 'orange' : 'green'}>{s || 'ON_TRACK'}</Tag> },
                      {
                        title: 'Allowed Time',
                        dataIndex: 'totalAllowedMinutes',
                        key: 'totalAllowedMinutes',
                        render: m => {
                          if (m === undefined || m === null || m === '') return '-';
                          const val = Number(m);
                          if (isNaN(val) || val <= 0) return '0m';
                          if (val < 60) return `${val}m`;
                          if (val < 480) {
                            const hrs = (val / 60).toFixed(1);
                            return `${hrs % 1 === 0 ? Math.round(hrs) : hrs}h`;
                          }
                          const days = (val / 480).toFixed(1);
                          const formattedDays = days % 1 === 0 ? Math.round(days) : days;
                          return `${formattedDays} ${formattedDays === 1 ? 'Day' : 'Days'}`;
                        }
                      },
                      {
                        title: 'Elapsed Time',
                        dataIndex: 'totalElapsedMinutes',
                        key: 'totalElapsedMinutes',
                        render: e => {
                          if (e === undefined || e === null || e === '') return '0m';
                          const val = Number(e);
                          if (isNaN(val) || val <= 0) return '0m';
                          if (val < 60) return `${val}m`;
                          if (val < 480) {
                            const hrs = (val / 60).toFixed(1);
                            return `${hrs % 1 === 0 ? Math.round(hrs) : hrs}h`;
                          }
                          const days = (val / 480).toFixed(1);
                          const formattedDays = days % 1 === 0 ? Math.round(days) : days;
                          return `${formattedDays} ${formattedDays === 1 ? 'Day' : 'Days'}`;
                        }
                      }
                    ]}
                  />
                );
              }

              let tabFilteredTasks = tasks;
              if (activeTab === 'my_tasks') {
                tabFilteredTasks = tasks.filter(t => t.assignee === user?.username || t.assignee === user?.name || t.claimedBy === user?.username);
              }

              const filtered = tabFilteredTasks.filter(task => {
                const ticketId = task.complaintId || '';
                const customerName = task.customerName || '';
                const desc = task.variables?.complaint?.description || '';
                const cat = task.variables?.complaint?.category || '';
                return !query ||
                  ticketId.toLowerCase().includes(query) ||
                  customerName.toLowerCase().includes(query) ||
                  desc.toLowerCase().includes(query) ||
                  cat.toLowerCase().includes(query);
              });

              if (filtered.length === 0) {
                return (
                  <Empty
                    description="No matching tasks found for selected view"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ marginTop: '60px' }}
                  />
                );
              }

              return (
                <TaskTable
                  tasks={filtered}
                  onSelectTask={handleTaskSelect}
                  onTaskClaimed={() => loadTasks(false)}
                />
              );
            })()}
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
                  marginBottom: '20px',
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
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Preferred Contact Number</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>
                        {selectedTask.variables?.customer?.phone || 'N/A'}
                      </Text>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Branch</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>
                        {selectedTask.variables?.complaint?.branch || 'N/A'}
                      </Text>
                    </div>

                    {selectedTask.variables?.complaint && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Complaint Description</Text>
                        <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500, textAlign: 'right', maxWidth: '280px' }}>
                          {selectedTask.variables.complaint.description}
                        </Text>
                      </div>
                    )}

                    {selectedTask.variables?.complaint?.voiceAttachmentUrl && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Voice Call Recording</Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <audio
                            src={ApiService.getAttachmentUrl(selectedTask.variables.complaint.voiceAttachmentUrl)}
                            controls
                            style={{ height: '32px', maxWidth: '200px' }}
                          />
                          <Button
                            href={ApiService.getAttachmentUrl(selectedTask.variables.complaint.voiceAttachmentUrl)}
                            download={selectedTask.variables.complaint.voiceAttachmentName || 'voice_recording.mp3'}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedTask.variables?.complaint?.evidenceUrl && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Evidence Attachment</Text>
                        <a
                          href={ApiService.getAttachmentUrl(selectedTask.variables.complaint.evidenceUrl)}
                          download={selectedTask.variables.complaint.evidenceName || 'evidence_attachment'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '14px', fontWeight: 600, color: BRAND_COLORS.primary }}
                        >
                          {selectedTask.variables.complaint.evidenceName || 'Download Evidence'}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </Col>

              <Col xs={24} lg={12}>
                <Card title="Audit Investigation" className="form-section">
                  <Form onFinish={handleSubmit} layout="vertical">
                    <Form.Item
                      label="Investigation Justification"
                      required
                      help="Provide the compliance justification for this audit decision."
                    >
                      <Input.TextArea
                        name="auditJustification"
                        value={formData.auditJustification}
                        onChange={handleFormChange}
                        rows={4}
                        placeholder="Provide details on compliance justification..."
                      />
                    </Form.Item>

                    <Form.Item label="Investigation Findings ">
                      <Input.TextArea
                        name="auditFindings"
                        value={formData.auditFindings}
                        onChange={handleFormChange}
                        rows={4}
                        placeholder="Enter audit findings..."
                      />
                    </Form.Item>

                    <Form.Item label="File Attachment (Optional)">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="file"
                          id="auditFile"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                        <Button
                          icon={<FileAddOutlined />}
                          onClick={() => document.getElementById('auditFile').click()}
                          style={{ alignSelf: 'flex-start' }}
                        >
                          {formData.auditAttachmentName ? 'Change File' : 'Choose File'}
                        </Button>
                        {formData.auditAttachmentName && (
                          <Text type="success" style={{ fontSize: '13px' }}>
                            Attached: {formData.auditAttachmentName}
                          </Text>
                        )}
                      </div>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={isSubmitting}
                        icon={<AuditOutlined />}
                        size="large"
                        style={{ width: '100%', marginTop: '12px' }}
                      >
                        {isSubmitting ? 'Processing...' : 'Submit to Chief Committee'}
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

export default AuditDashboard;
