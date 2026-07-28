import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Alert, Form, Input, Space, Row, Col, Divider, Descriptions } from 'antd';
import {
  DeleteOutlined,
  ArrowLeftOutlined,
  FileAddOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PaperClipOutlined,
  SoundOutlined,
  AuditOutlined,
  FileTextOutlined,
  UserOutlined,
  BankOutlined,
  CreditCardOutlined,
  SafetyCertificateOutlined,
  UploadOutlined
} from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import TaskCard from '../components/TaskCard';
import TaskTable from '../components/TaskTable';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

function ChiefCommitteeDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    committeeExplanation: '',
    committeeAttachment: '',
    committeeAttachmentName: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [clearingTasks, setClearingTasks] = useState(false);

  useEffect(() => {
    loadTasks(true);

    const interval = setInterval(() => {
      loadTasks(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadTasks = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const tasksData = await ApiService.getEnrichedTasks();
      const committeeTasks = tasksData.filter(task =>
        task.definitionKey === 'FormTask_ChiefCommittee'
      );
      setTasks(committeeTasks);
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
        setFormData({ committeeExplanation: '', committeeAttachment: '', committeeAttachmentName: '' });
        await loadTasks(true);

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
        committeeAttachmentName: file.name
      }));
    }
  };

  const handleDecision = async (decision) => {
    if (!selectedTask) return;

    if (!formData.committeeExplanation.trim()) {
      setMessage('Error: Committee Explanation / Recommendation is required.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      let uploadedUrl = formData.committeeAttachment;
      let uploadedName = formData.committeeAttachmentName;

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
        committeeDecision: decision,
        committeeExplanation: formData.committeeExplanation,
        committeeAttachment: uploadedUrl,
        committeeAttachmentName: uploadedName
      };

      await ApiService.completeTask(selectedTask.id, variables);

      if (decision === 'approved') {
        setMessage('Task approved! Complaint has been routed back to CMD screening.');
      } else {
        setMessage('Task rejected! Customer has been notified and the workflow ended.');
      }

      setFormData({ committeeExplanation: '', committeeAttachment: '', committeeAttachmentName: '' });
      setSelectedFile(null);
      setSelectedTask(null);
      await loadTasks(true);
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
    <DashboardLayout userRole="chief-committee">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
              Hello, {user?.fullName || user?.username || ''}
            </Title>
            <Text type="secondary" style={{ fontSize: '15px' }}>
              Final decisions on Investigated cases
            </Text>
          </div>
          {/* Hiding Clear All Tasks button for now as requested
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
          */}
        </div>

        {message && (
          <Alert
            message={message.includes('Success') || message.includes('approved') || message.includes('rejected') ? 'Success' : 'Error'}
            description={message.replace(/^(Success|Error):\s*/, '')}
            type={message.includes('Success') || message.includes('approved') || message.includes('rejected') ? 'success' : 'error'}
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
                description="No committee review tasks available"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ marginTop: '60px' }}
              />
            ) : (
              <TaskTable
                tasks={tasks}
                onSelectTask={handleTaskSelect}
                onTaskClaimed={() => loadTasks(true)}
              />
            )}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedTask(null)} style={{ borderRadius: '6px' }} />
            </div>

            <Row gutter={[24, 24]}>
              {/* Left Column: Complaint & Audit Details */}
              <Col xs={24} lg={13}>
                {/* 1. Complaint Details Card */}
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
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Account number</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>
                        {selectedTask.variables?.customer?.accountNumber || selectedTask.variables?.accountNumber || 'N/A'}
                      </Text>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Branch</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>
                        {selectedTask.variables?.complaint?.branch || selectedTask.variables?.branch || 'N/A'}
                      </Text>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Complaint Description</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500, textAlign: 'right', maxWidth: '280px' }}>
                        {selectedTask.variables?.complaint?.description || selectedTask.variables?.description || 'No description provided.'}
                      </Text>
                    </div>

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

                {/* 2. Audit Investigation Details Card */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      Audit Investigation Details
                    </Text>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Audit Justification</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500, textAlign: 'right', maxWidth: '280px' }}>
                        {selectedTask.variables?.auditJustification || 'No justification provided.'}
                      </Text>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Audit Findings</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500, textAlign: 'right', maxWidth: '280px' }}>
                        {selectedTask.variables?.auditFindings || 'No findings provided.'}
                      </Text>
                    </div>

                    {(selectedTask.variables?.auditAttachment || selectedTask.variables?.auditAttachmentName) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Audit Investigation Attachment</Text>
                        <a
                          href={ApiService.getAttachmentUrl(
                            selectedTask.variables.auditAttachment ||
                            `http://localhost:8080/api/complaints/attachments/${selectedTask.variables.auditAttachmentName}`
                          )}
                          download={selectedTask.variables.auditAttachmentName || 'audit_attachment'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '14px', fontWeight: 600, color: BRAND_COLORS.primary }}
                        >
                          {selectedTask.variables.auditAttachmentName || 'Download Attachment'}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </Col>

              {/* Right Column: Committee Decision Form Card */}
              <Col xs={24} lg={11}>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #f1f5f9',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
                }}>
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                        Committee Decision Form
                      </Text>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                      <Form layout="vertical">
                        <Form.Item
                          label={<span style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>Committee Explanation / Recommendation</span>}
                          required
                          extra={<span style={{ color: '#94a3b8', fontSize: '12px' }}>Please enter the explanation or reasoning for this approval or rejection.</span>}
                        >
                          <Input.TextArea
                            name="committeeExplanation"
                            value={formData.committeeExplanation}
                            onChange={handleFormChange}
                            rows={5}
                            placeholder="Provide details on explanation or decision reasoning..."
                            style={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          />
                        </Form.Item>

                        <Form.Item label={<span style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>File Attachment</span>}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="file"
                              id="committeeFile"
                              onChange={handleFileChange}
                              style={{ display: 'none' }}
                            />
                            <Button
                              onClick={() => document.getElementById('committeeFile').click()}
                              style={{ borderRadius: '6px' }}
                            >
                              {formData.committeeAttachmentName ? 'Change File' : 'Choose File'}
                            </Button>
                            {formData.committeeAttachmentName && (
                              <Text type="success" style={{ fontSize: '13px' }}>
                                Attached: {formData.committeeAttachmentName}
                              </Text>
                            )}
                          </div>
                        </Form.Item>
                      </Form>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                    <Button
                      type="primary"
                      danger
                      onClick={() => handleDecision('rejected')}
                      loading={isSubmitting}
                      size="large"
                      style={{ flex: 1, borderRadius: '8px', fontWeight: 600, height: '44px' }}
                    >
                      Reject
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => handleDecision('approved')}
                      loading={isSubmitting}
                      size="large"
                      style={{ flex: 1, borderRadius: '8px', fontWeight: 600, height: '44px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                    >
                      Approve
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

export default ChiefCommitteeDashboard;
