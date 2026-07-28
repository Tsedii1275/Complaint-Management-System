import React, { useState } from 'react';
import { Card, Typography, Button, Form, Input, Select, Alert, Row, Col, Space, Divider, Checkbox } from 'antd';
import { PlusCircleOutlined, InfoCircleOutlined, CheckCircleOutlined, CloudUploadOutlined, PaperClipOutlined, DeleteOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';

const { Title, Text, Paragraph } = Typography;

function BranchStaffDashboard() {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [fcrChecked, setFcrChecked] = useState(false);

  // Voice Attachment States
  const [voiceAttachmentUrl, setVoiceAttachmentUrl] = useState('');
  const [voiceAttachmentName, setVoiceAttachmentName] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Evidence Attachment States
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  // Handle file upload selection
  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingAudio(true);
    try {
      const response = await ApiService.uploadAudio(file, file.name);
      setVoiceAttachmentUrl(response.url);
      setVoiceAttachmentName(response.fileName);
    } catch (error) {
      console.error('Audio upload failed:', error);
      alert('Failed to upload audio file. Please try again.');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingEvidence(true);
    try {
      const response = await ApiService.uploadEvidence(file);
      setEvidenceUrl(response.url);
      setEvidenceName(response.fileName);
    } catch (error) {
      console.error('Evidence upload failed:', error);
      alert('Failed to upload evidence file. Please try again.');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const normalizePhone = (phone) => {
    if (!phone) return phone;
    if (phone.startsWith('09')) return '+251' + phone.substring(1);
    if (phone.startsWith('9')) return '+251' + phone;
    return phone;
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setMessage('');

    try {
      const phone = normalizePhone(values.phone);

      const payload = {
        customer: {
          name: values.customerName,
          email: values.email || '',
          phone: phone,
          accountNumber: values.accountNumber,
          preferredContactMethod: values.preferredContactMethod || 'Email'
        },
        complaint: {
          channel: values.channel || 'branch',
          category: values.complaintCategory,
          description: values.complaintDescription,
          branch: values.branch || '',
          resolutionNotes: values.resolutionNotes || '',
          voiceAttachmentUrl: voiceAttachmentUrl || undefined,
          voiceAttachmentName: voiceAttachmentName || undefined,
          evidenceUrl: evidenceUrl || undefined,
          evidenceName: evidenceName || undefined
        }
      };

      if (fcrChecked) {
        const result = await ApiService.fcrResolveComplaint(payload);
        setMessage(`FCR_SUCCESS: Complaint resolved at First Contact Resolution. Ticket: ${result.ticketId}`);
      } else {
        await ApiService.staffSubmitComplaint(payload);
        setMessage('Success: Complaint registered successfully and sent directly to CMD screening.');
      }

      form.resetFields();
      setFcrChecked(false);
      setVoiceAttachmentUrl('');
      setVoiceAttachmentName('');
      setEvidenceUrl('');
      setEvidenceName('');
    } catch (error) {
      console.error('Error submitting complaint:', error);
      setMessage('Error: Failed to submit complaint. Please check fields and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFcrSuccess = message.startsWith('FCR_SUCCESS');
  const isSuccess = message.startsWith('Success') || isFcrSuccess;
  const displayMessage = message.replace(/^(FCR_SUCCESS|Success|Error):\s*/, '');

  return (
    <DashboardLayout userRole="branch-staff">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
              Register Customer Complaint
            </Title>
            <Text type="secondary" style={{ fontSize: '15px' }}>
              Branch Complaint Intake Portal
            </Text>
          </div>
        </div>

        {message && (
          <Alert
            message={
              isFcrSuccess
                ? 'Resolved at First Contact'
                : isSuccess
                  ? 'Success'
                  : 'Error'
            }
            description={displayMessage}
            type={isSuccess ? 'success' : 'error'}
            showIcon
            closable
            style={{ marginBottom: '24px' }}
            onClose={() => setMessage('')}
          />
        )}

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card
              bordered={true}
              style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                  complaintCategory: 'general',
                  channel: 'branch',
                  preferredContactMethod: 'Email'
                }}
              >
                <Title level={4} style={{ color: BRAND_COLORS.primary, marginTop: 0, marginBottom: '20px' }}>
                  Customer Information
                </Title>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="customerName"
                      label="Customer Name"
                      rules={[{ required: true, message: 'Please enter the customer name' }]}
                    >
                      <Input placeholder="Full Name" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="email"
                      label="Email Address (Optional)"
                      rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                    >
                      <Input placeholder="Email Address" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="phone"
                      label="Preferred Contact Number"
                      extra={<span style={{ fontSize: '12px', color: '#8c8c8c' }}>Please provide the phone number currently in use so we can contact you regarding your complaint.</span>}
                      rules={[
                        { required: true, message: 'Please enter the contact number' },
                        {
                          pattern: /^(\+2519\d{8}|09\d{8}|9\d{8})$/,
                          message: 'Please enter a valid phone number (e.g. +2519xxxxxxxx or 09xxxxxxxx)'
                        }
                      ]}
                    >
                      <Input placeholder="+2519xxxxxxxx or 09xxxxxxxx" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="accountNumber"
                      label="Account Number"
                      rules={[
                        { required: true, message: 'Account number is mandatory' },
                        { len: 13, message: 'Account number must be exactly 13 digits' }
                      ]}
                    >
                      <Input placeholder="13-digit account number" maxLength={13} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="branch"
                      label="Branch (Optional)"
                    >
                      <Input placeholder="Select or enter your branch (optional)" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="preferredContactMethod"
                      label="Preferred Contact Method"
                      rules={[{ required: true, message: 'Please select a contact method' }]}
                    >
                      <Select placeholder="Select preferred contact method">
                        <Select.Option value="SMS">SMS</Select.Option>
                        <Select.Option value="Email">Email</Select.Option>
                        <Select.Option value="Both">Both</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Divider style={{ margin: '20px 0' }} />

                <Title level={4} style={{ color: BRAND_COLORS.primary, marginTop: 0, marginBottom: '20px' }}>
                  Complaint Details
                </Title>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="complaintCategory"
                      label="Complaint Category"
                      rules={[{ required: true, message: 'Please select category' }]}
                    >
                      <Select placeholder="Select category">
                        <Select.Option value="financial">Financial - Banking Services</Select.Option>
                        <Select.Option value="atm">ATM - Card Services</Select.Option>
                        <Select.Option value="technical">Technical - System Issues</Select.Option>
                        <Select.Option value="account">Account - Management</Select.Option>
                        <Select.Option value="loan">Loan - Credit Services</Select.Option>
                        <Select.Option value="branch">Branch - Customer Service</Select.Option>
                        <Select.Option value="mobile">Mobile - App/Digital Banking</Select.Option>
                        <Select.Option value="fraud">Fraud - Security Issues</Select.Option>
                        <Select.Option value="employee_behaviour">Employee Behaviour - Staff Related</Select.Option>
                        <Select.Option value="internet_banking">Internet Banking</Select.Option>
                        <Select.Option value="super_app">Super App</Select.Option>
                        <Select.Option value="general">General - Other Issues</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="channel"
                      label="Channel"
                      rules={[{ required: true, message: 'Please select submission channel' }]}
                    >
                      <Select placeholder="Select channel">
                        <Select.Option value="branch">Branch</Select.Option>
                        <Select.Option value="phone">Phonecall</Select.Option>
                        <Select.Option value="social_media">Social Media</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="complaintDescription"
                  label="Complaint Description"
                  rules={[{ required: true, message: 'Please describe the complaint details' }]}
                >
                  <Input.TextArea rows={5} placeholder="Provide details of the customer complaint..." />
                </Form.Item>

                {/* Voice Attachment for Phone Calls */}
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.channel !== currentValues.channel}>
                  {({ getFieldValue }) => {
                    const channel = getFieldValue('channel');
                    if (channel === 'phone') {
                      return (
                        <div style={{
                          background: '#fafafa',
                          border: '1px solid #d9d9d9',
                          borderRadius: '8px',
                          padding: '16px 20px',
                          marginBottom: '20px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                        }}>
                          <Title level={5} style={{ color: BRAND_COLORS.primary, marginTop: 0, marginBottom: '12px' }}>
                            <CloudUploadOutlined style={{ marginRight: '8px' }} />
                            Voice Call Attachment
                          </Title>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '13px' }}>
                            Upload the recorded phone call audio file to attach it to this complaint.
                          </Text>
                          <input 
                            type="file" 
                            accept="audio/*" 
                            onChange={handleAudioUpload} 
                            style={{ display: 'none' }}
                            id="audio-file-input"
                          />
                          <Space>
                            <Button 
                              icon={<CloudUploadOutlined />}
                              onClick={() => document.getElementById('audio-file-input').click()}
                              loading={isUploadingAudio}
                            >
                              {voiceAttachmentUrl ? 'Change Audio File' : 'Choose Audio File'}
                            </Button>
                            {voiceAttachmentName && (
                              <Text type="success">✓ {voiceAttachmentName}</Text>
                            )}
                          </Space>

                          {voiceAttachmentUrl && (
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e8e8e8' }}>
                              <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                Attached Preview:
                              </Text>
                              <audio src={voiceAttachmentUrl} controls style={{ width: '100%' }} />
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                </Form.Item>

                <div style={{
                  marginTop: '16px',
                  padding: '20px',
                  background: '#f9f9f9',
                  border: '1px solid #e8e8e8',
                  borderRadius: '8px'
                }}>
                  <Title level={5} style={{ color: BRAND_COLORS.primary, marginTop: 0, marginBottom: '12px' }}>
                    <PaperClipOutlined style={{ marginRight: '8px' }} />
                    Evidence Attachment
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '13px' }}>
                    Upload any relevant documents, screenshots, or files to support the complaint (PDF, images, etc.).
                  </Text>
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    onChange={handleEvidenceUpload} 
                    style={{ display: 'none' }}
                    id="staff-evidence-file-input"
                  />
                  <Space>
                    <Button 
                      icon={<PaperClipOutlined />}
                      onClick={() => document.getElementById('staff-evidence-file-input').click()}
                      loading={isUploadingEvidence}
                    >
                      {evidenceUrl ? 'Change Evidence File' : 'Choose Evidence File'}
                    </Button>
                    {evidenceName && (
                      <Space>
                        <Text type="success">✓ {evidenceName}</Text>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            setEvidenceUrl('');
                            setEvidenceName('');
                          }}
                          size="small"
                        />
                      </Space>
                    )}
                  </Space>
                </div>

                <Divider style={{ margin: '20px 0' }} />

                {/* ── First Contact Resolution Section ── */}
                <div
                  style={{
                    background: fcrChecked ? '#f6ffed' : '#fafafa',
                    border: `1.5px solid ${fcrChecked ? '#b7eb8f' : '#d9d9d9'}`,
                    borderRadius: '8px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <Form.Item name="fcrResolved" valuePropName="checked" noStyle>
                    <Checkbox
                      checked={fcrChecked}
                      onChange={(e) => {
                        setFcrChecked(e.target.checked);
                        if (!e.target.checked) {
                          form.setFieldsValue({ resolutionNotes: '' });
                        }
                      }}
                      style={{ fontWeight: 600, fontSize: '14px', color: fcrChecked ? '#389e0d' : '#595959' }}
                    >
                      Resolved at First Contact Resolution
                    </Checkbox>
                  </Form.Item>
                  <div style={{ marginTop: '6px', marginLeft: '24px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Check this if the complaint was fully resolved at the branch without requiring further escalation to CMD.
                      The complaint will be recorded, a ticket generated, and the case will be immediately closed.
                    </Text>
                  </div>

                  {fcrChecked && (
                    <div style={{ marginTop: '16px' }}>
                      <Form.Item
                        name="resolutionNotes"
                        label={<span style={{ fontWeight: 600, color: '#389e0d' }}>Resolution Notes / Comments</span>}
                        rules={[{ required: true, message: 'Please provide resolution notes for FCR cases' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input.TextArea
                          rows={4}
                          placeholder="Describe how the complaint was resolved at first contact (e.g., information provided, transaction reversed, customer satisfied)..."
                          style={{ borderColor: '#b7eb8f' }}
                        />
                      </Form.Item>
                    </div>
                  )}
                </div>

                <Form.Item style={{ marginTop: '8px' }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={isSubmitting}
                    icon={fcrChecked ? <CheckCircleOutlined /> : <PlusCircleOutlined />}
                    size="large"
                    style={{
                      width: '100%',
                      background: fcrChecked ? '#52c41a' : undefined,
                      borderColor: fcrChecked ? '#52c41a' : undefined
                    }}
                  >
                    {isSubmitting
                      ? (fcrChecked ? 'Closing Case...' : 'Registering...')
                      : (fcrChecked ? 'Close Case at First Contact' : 'Register and Send to CMD')}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ fontWeight: 600, color: BRAND_COLORS.primary, display: 'flex', alignItems: 'center', gap: '8px' }}><InfoCircleOutlined /> Branch Intake Guide</span>}
              bordered={true}
              style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', height: '100%' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Title level={5} style={{ margin: 0, color: BRAND_COLORS.primary }}>1. Verify Customer Identity</Title>
                  <Paragraph style={{ margin: 0, fontSize: '13px', color: '#595959' }}>
                    Confirm customer identity using national ID, passport, or driver's license before entering account details.
                  </Paragraph>
                </div>
                <div>
                  <Title level={5} style={{ margin: 0, color: BRAND_COLORS.primary }}>2. Mandatory Account Numbers</Title>
                  <Paragraph style={{ margin: 0, fontSize: '13px', color: '#595959' }}>
                    Ensure the 13-digit account number is correctly entered.
                  </Paragraph>
                </div>
                <div>
                  <Title level={5} style={{ margin: 0, color: BRAND_COLORS.primary }}>3. Select Proper Category</Title>
                  <Paragraph style={{ margin: 0, fontSize: '13px', color: '#595959' }}>
                    Categoriz accurately
                  </Paragraph>
                </div>
                <div>
                  <Title level={5} style={{ margin: 0, color: BRAND_COLORS.primary }}>4. First Contact Resolution (FCR)</Title>
                  <Paragraph style={{ margin: 0, fontSize: '13px', color: '#595959' }}>
                    If the complaint is fully resolved at the branch, check the FCR box, provide resolution notes, and close the case.

                  </Paragraph>
                </div>

              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </DashboardLayout>
  );
}

export default BranchStaffDashboard;
