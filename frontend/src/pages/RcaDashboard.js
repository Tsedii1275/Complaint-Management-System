import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, Select, Input, Space, Button, Alert, Progress, Statistic, Row, Col, Divider, Tooltip, Form, DatePicker, Modal, Tabs, List, Popconfirm, Avatar, message } from 'antd';
import { ReloadOutlined, FilterOutlined, DownloadOutlined, ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, SyncOutlined, HistoryOutlined, FileExcelOutlined, FilePdfOutlined, SafetyCertificateOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

function RcaDashboard() {
  const [cases, setCases] = useState([]);
  const [closedTickets, setClosedTickets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Modals / Forms
  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);
  const [editingCapa, setEditingCapa] = useState(null);
  const [capaForm] = Form.useForm();
  const [rcaForm] = Form.useForm();
  const [whysForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch RCA Cases
      const allCases = await ApiService.getRcaCases();
      // Filter out NOT_REQUIRED status cases from the active dashboard view
      const activeCases = allCases.filter(c => c.rcaStatus !== 'NOT_REQUIRED');
      setCases(activeCases);

      // Fetch Analytics
      const stats = await ApiService.getRcaAnalytics();
      setAnalytics(stats);

      // Fetch Audit Logs to find Closed Tickets
      const logs = await ApiService.getAuditLogs();
      
      // Group logs to find tickets that are closed
      const grouped = {};
      logs.forEach(log => {
        const tid = log.complaintId || 'unknown';
        if (!grouped[tid]) {
          grouped[tid] = {
            ticketId: tid,
            processInstanceId: log.processInstanceId,
            customerName: log.customerName,
            category: log.complaintCategory,
            description: log.complaintDescription,
            isClosed: false,
            createdAt: log.createdAt
          };
        }
        if (log.action === 'CASE_CLOSED' || log.action === 'CASE_CLOSED_BY_CUSTOMER' || log.action === 'FCR_RESOLVED') {
          grouped[tid].isClosed = true;
        }
      });

      // Filter closed tickets that don't have a decision yet
      const closedList = Object.values(grouped).filter(t => t.isClosed && t.ticketId !== 'unknown');
      
      // Check which closed tickets already have an RCA record (including NOT_REQUIRED)
      const existingTicketIds = new Set(allCases.map(c => c.ticketId));
      const pendingDecisionList = closedList.filter(t => !existingTicketIds.has(t.ticketId));

      setClosedTickets(pendingDecisionList);
    } catch (err) {
      console.error('Failed to load RCA data:', err);
      setError('Failed to load RCA data from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (ticketId, processInstanceId, rcaRequired) => {
    try {
      await ApiService.triggerRca(ticketId, processInstanceId, rcaRequired);
      message.success(`RCA decision submitted successfully for ticket ${ticketId}.`);
      await loadData();
    } catch (err) {
      console.error(err);
      message.error('Failed to submit RCA decision.');
    }
  };

  const handleCaseSelect = async (rcaCase) => {
    setSelectedCase(rcaCase);
    rcaForm.setFieldsValue({
      rootCauseCategory: rcaCase.rootCauseCategory,
      financialImpact: rcaCase.financialImpact,
      reputationalRisk: rcaCase.reputationalRisk,
      complianceImpact: rcaCase.complianceImpact,
      operationalDisruption: rcaCase.operationalDisruption,
      preventiveStrategy: rcaCase.preventiveStrategy,
      rcaStatus: rcaCase.rcaStatus
    });

    if (rcaCase.whys) {
      whysForm.setFieldsValue({
        why1: rcaCase.whys.why1,
        why2: rcaCase.whys.why2,
        why3: rcaCase.whys.why3,
        why4: rcaCase.whys.why4,
        why5: rcaCase.whys.why5,
        rootCauseStatement: rcaCase.whys.rootCauseStatement
      });
    } else {
      whysForm.resetFields();
    }

    try {
      setLoading(true);
      const fullCase = await ApiService.getRcaCaseById(rcaCase.id);
      const targetCase = fullCase || rcaCase;
      setSelectedCase(targetCase);

      rcaForm.setFieldsValue({
        rootCauseCategory: targetCase.rootCauseCategory,
        financialImpact: targetCase.financialImpact,
        reputationalRisk: targetCase.reputationalRisk,
        complianceImpact: targetCase.complianceImpact,
        operationalDisruption: targetCase.operationalDisruption,
        preventiveStrategy: targetCase.preventiveStrategy,
        rcaStatus: targetCase.rcaStatus
      });

      if (targetCase.whys) {
        whysForm.setFieldsValue({
          why1: targetCase.whys.why1,
          why2: targetCase.whys.why2,
          why3: targetCase.whys.why3,
          why4: targetCase.whys.why4,
          why5: targetCase.whys.why5,
          rootCauseStatement: targetCase.whys.rootCauseStatement
        });
      }

      const logs = await ApiService.getRcaAuditLogs(targetCase.id);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRcaSubmit = async (values) => {
    if (!selectedCase) return;
    try {
      setLoading(true);
      const updated = await ApiService.updateRcaCase(selectedCase.id, values);
      setSelectedCase(updated);
      message.success('RCA case details updated successfully.');
      await loadData();
    } catch (err) {
      console.error(err);
      message.error('Failed to update RCA case details.');
    } finally {
      setLoading(false);
    }
  };

  const handleWhysSubmit = async (values) => {
    if (!selectedCase) return;
    try {
      setLoading(true);
      const savedWhys = await ApiService.updateRcaWhys(selectedCase.id, values);
      setSelectedCase(prev => ({ ...prev, whys: savedWhys }));
      message.success('5 Whys model updated successfully.');
      await loadData();
    } catch (err) {
      console.error(err);
      message.error('Failed to update 5 Whys.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCapa = () => {
    setEditingCapa(null);
    capaForm.resetFields();
    setIsCapaModalOpen(true);
  };

  const handleEditCapa = (action) => {
    setEditingCapa(action);
    capaForm.setFieldsValue({
      actionType: action.actionType,
      actionDescription: action.actionDescription,
      owner: action.owner,
      targetDate: action.targetDate ? moment(action.targetDate) : null,
      implementationStatus: action.implementationStatus,
      effectivenessRating: action.effectivenessRating,
      verificationNotes: action.verificationNotes
    });
    setIsCapaModalOpen(true);
  };

  const handleCapaSubmit = async (values) => {
    if (!selectedCase) return;
    try {
      setLoading(true);
      const payload = {
        ...values,
        targetDate: values.targetDate ? values.targetDate.format('YYYY-MM-DD') : null
      };

      if (editingCapa) {
        await ApiService.updateCapaAction(editingCapa.id, payload);
        message.success('CAPA Action updated successfully.');
      } else {
        await ApiService.addCapaAction(selectedCase.id, payload);
        message.success('CAPA Action added successfully.');
      }

      setIsCapaModalOpen(false);
      capaForm.resetFields();

      // Reload selected case to show updated actions
      const updatedCase = await ApiService.getRcaCaseById(selectedCase.id);
      setSelectedCase(updatedCase);
      await loadData();
    } catch (err) {
      console.error(err);
      message.error('Failed to save CAPA action.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCapa = async (actionId) => {
    if (!selectedCase) return;
    try {
      setLoading(true);
      await ApiService.deleteCapaAction(actionId);
      message.success('CAPA Action deleted successfully.');

      const updatedCase = await ApiService.getRcaCaseById(selectedCase.id);
      setSelectedCase(updatedCase);
      await loadData();
    } catch (err) {
      console.error(err);
      message.error('Failed to delete CAPA action.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'processing';
      case 'PENDING': return 'warning';
      case 'OVERDUE': return 'error';
      default: return 'default';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toUpperCase()) {
      case 'CRITICAL': return '#9f1239'; // deep crimson
      case 'HIGH': return '#dc2626';     // red
      case 'MEDIUM': return '#d97706';   // amber
      case 'LOW': return '#059669';      // emerald
      default: return 'default';
    }
  };

  // Columns for main tables
  const caseColumns = [
    {
      title: 'Ticket ID',
      dataIndex: 'ticketId',
      key: 'ticketId',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'rcaStatus',
      key: 'rcaStatus',
      render: (text) => <Tag color={getStatusColor(text)}>{text}</Tag>,
    },
    {
      title: 'Root Cause Category',
      dataIndex: 'rootCauseCategory',
      key: 'rootCauseCategory',
      render: (text) => text || <Text type="secondary" italic>Undecided</Text>,
    },
    {
      title: 'Financial Loss',
      dataIndex: 'financialImpact',
      key: 'financialImpact',
      render: (val) => val ? `ETB ${parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'ETB 0.00',
    },
    {
      title: 'Reputational Risk',
      dataIndex: 'reputationalRisk',
      key: 'reputationalRisk',
      render: (text) => <Tag color={getRiskColor(text)} style={{ fontWeight: 'bold' }}>{text}</Tag>,
    },
    {
      title: 'Risk Score',
      dataIndex: 'riskScore',
      key: 'riskScore',
      render: (score) => <Text strong>{score?.toFixed(1) || '0.0'}</Text>,
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => {
        const isCompleted = (record.rcaStatus || '').toUpperCase() === 'COMPLETED';
        return (
          <Button
            type={isCompleted ? "default" : "primary"}
            size="small"
            icon={isCompleted ? <EyeOutlined /> : <EditOutlined />}
            onClick={() => handleCaseSelect(record)}
          >
            {isCompleted ? 'View' : 'Analyze'}
          </Button>
        );
      },
    },
  ];

  return (
    <DashboardLayout userRole="admin">
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Title level={2} style={{ color: BRAND_COLORS.primary, margin: 0 }}>
              Root Cause Analysis (RCA) Module
            </Title>
            <Text type="secondary">Post-resolution problem identification, 5 Whys, and corrective preventive actions</Text>
          </div>
          <Space>
            <Button 
              icon={<FileExcelOutlined />} 
              onClick={async () => {
                try {
                  message.loading({ content: 'Exporting CSV report...', key: 'exporting' });
                  await ApiService.downloadFile('/api/rca/cases/export/excel', 'rca_cases_export.csv');
                  message.success({ content: 'CSV report downloaded successfully!', key: 'exporting' });
                } catch (err) {
                  message.error({ content: 'Failed to export CSV report: ' + err.message, key: 'exporting' });
                }
              }}
            >
              Export CSV
            </Button>
            <Button 
              type="primary" 
              icon={<FilePdfOutlined />} 
              onClick={async () => {
                try {
                  message.loading({ content: 'Exporting Text report...', key: 'exporting' });
                  await ApiService.downloadFile('/api/rca/cases/export/pdf', 'rca_cases_report.txt');
                  message.success({ content: 'Text report downloaded successfully!', key: 'exporting' });
                } catch (err) {
                  message.error({ content: 'Failed to export Text report: ' + err.message, key: 'exporting' });
                }
              }}
            >
              Export Report
            </Button>
          </Space>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '20px' }} />}

        {!selectedCase ? (
          <div>
            {/* Analytics Stats */}
            {analytics && (
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={12} sm={6}>
                  <Card bordered={false} className="stats-card">
                    <Statistic title="Total RCAs" value={analytics.total} valueStyle={{ color: BRAND_COLORS.primary }} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card bordered={false} className="stats-card">
                    <Statistic title="Pending" value={analytics.pending} valueStyle={{ color: '#d97706' }} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card bordered={false} className="stats-card">
                    <Statistic title="Completed" value={analytics.completed} valueStyle={{ color: '#059669' }} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card bordered={false} className="stats-card">
                    <Statistic title="Financial Impact" value={parseFloat(analytics.totalFinancialImpact || 0)} precision={2} prefix="ETB " valueStyle={{ color: '#b91c1c' }} />
                  </Card>
                </Col>
              </Row>
            )}

            <Tabs defaultActiveKey="cases">
              <TabPane tab="Active RCA Cases" key="cases">
                <Card>
                  {/* Search and Filters */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <Input
                      placeholder="Search Ticket ID..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ width: '250px' }}
                    />
                    <Select
                      placeholder="Filter by Status"
                      value={statusFilter || undefined}
                      onChange={val => setStatusFilter(val || '')}
                      allowClear
                      style={{ width: '180px' }}
                    >
                      <Option value="PENDING">Pending</Option>
                      <Option value="IN_PROGRESS">In Progress</Option>
                      <Option value="COMPLETED">Completed</Option>
                    </Select>
                    <Select
                      placeholder="Filter by Reputational Risk"
                      value={riskFilter || undefined}
                      onChange={val => setRiskFilter(val || '')}
                      allowClear
                      style={{ width: '180px' }}
                    >
                      <Option value="LOW">Low</Option>
                      <Option value="MEDIUM">Medium</Option>
                      <Option value="HIGH">High</Option>
                      <Option value="CRITICAL">Critical</Option>
                    </Select>

                    {(searchQuery || statusFilter || riskFilter) && (
                      <Button
                        type="link"
                        icon={<SyncOutlined />}
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('');
                          setRiskFilter('');
                        }}
                      >
                        Reset Filters
                      </Button>
                    )}
                  </div>

                  {(() => {
                    const query = searchQuery.toLowerCase().trim();
                    const filtered = cases.filter(c => {
                      const matchesSearch = !query || c.ticketId.toLowerCase().includes(query);
                      const matchesStatus = !statusFilter || c.rcaStatus === statusFilter;
                      const matchesRisk = !riskFilter || c.reputationalRisk === riskFilter;
                      return matchesSearch && matchesStatus && matchesRisk;
                    });

                    return (
                      <Table
                        columns={caseColumns}
                        dataSource={filtered}
                        rowKey="id"
                        pagination={{
                          pageSize: 10,
                          showSizeChanger: true,
                          pageSizeOptions: [10, 25, 50, 100],
                          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} RCA cases`
                        }}
                        loading={loading}
                      />
                    );
                  })()}
                </Card>
              </TabPane>

              <TabPane tab={`Decision Queue (${closedTickets.length})`} key="decision">
                <Card>
                  <Table
                    dataSource={closedTickets}
                    rowKey="ticketId"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: [10, 25, 50, 100],
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tickets`
                    }}
                    columns={[
                      {
                        title: 'Ticket ID',
                        dataIndex: 'ticketId',
                        render: (text) => <Text strong>{text}</Text>
                      },
                      {
                        title: 'Customer Name',
                        dataIndex: 'customerName',
                        render: (text) => text || 'N/A'
                      },
                      {
                        title: 'Complaint Category',
                        dataIndex: 'category',
                        render: (text) => text || 'N/A'
                      },
                      {
                        title: 'Description Summary',
                        dataIndex: 'description',
                        render: (text) => text ? (text.length > 60 ? text.substring(0, 60) + '...' : text) : 'N/A'
                      },
                      {
                        title: 'RCA Required?',
                        key: 'action',
                        render: (_, record) => (
                          <Space size="middle">
                            <Button
                              type="primary"
                              onClick={() => handleDecision(record.ticketId, record.processInstanceId, true)}
                              style={{ background: '#059669', borderColor: '#059669' }}
                            >
                              Yes
                            </Button>
                            <Button
                              danger
                              onClick={() => handleDecision(record.ticketId, record.processInstanceId, false)}
                            >
                              No
                            </Button>
                          </Space>
                        )
                      }
                    ]}
                    locale={{ emptyText: 'No closed tickets awaiting RCA decision.' }}
                  />
                </Card>
              </TabPane>
            </Tabs>
          </div>
        ) : (() => {
          const isCaseCompleted = (selectedCase?.rcaStatus || '').toUpperCase() === 'COMPLETED';
          return (
            <div>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => { setSelectedCase(null); loadData(); }}
                style={{ marginBottom: '24px' }}
              >
                Back to Overview
              </Button>

              <Row gutter={[24, 24]}>
                {/* Left Column: RCA Metadata & 5 Whys */}
                <Col xs={24} lg={14}>
                  <Card title="RCA Case Analysis Form" extra={<Tag color={getStatusColor(selectedCase.rcaStatus)}>{selectedCase.rcaStatus}</Tag>}>
                    <Form
                      form={rcaForm}
                      onFinish={handleRcaSubmit}
                      layout="vertical"
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="Ticket ID">
                            <Input value={selectedCase.ticketId} disabled />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="rcaStatus" label="RCA Status" rules={[{ required: true }]}>
                            <Select disabled={isCaseCompleted}>
                              <Option value="PENDING">Pending</Option>
                              <Option value="IN_PROGRESS">In Progress</Option>
                              <Option value="COMPLETED">Completed</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name="rootCauseCategory" label="Root Cause Category" rules={[{ required: true }]}>
                            <Select placeholder="Select category" disabled={isCaseCompleted}>
                              <Option value="System Failure">System Failure</Option>
                              <Option value="Process Gap">Process Gap</Option>
                              <Option value="Staff Error / Negligence">Staff Error / Negligence</Option>
                              <Option value="Vendor/Third-Party Issue">Vendor/Third-Party Issue</Option>
                              <Option value="Compliance Breach">Compliance Breach</Option>
                              <Option value="Other">Other</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="reputationalRisk" label="Reputational Risk" rules={[{ required: true }]}>
                            <Select disabled={isCaseCompleted}>
                              <Option value="LOW">Low</Option>
                              <Option value="MEDIUM">Medium</Option>
                              <Option value="HIGH">High</Option>
                              <Option value="CRITICAL">Critical</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name="financialImpact" label="Financial Loss (ETB)">
                            <Input type="number" prefix="ETB" placeholder="0.00" disabled={isCaseCompleted} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Calculated Risk Score">
                            <Input value={selectedCase.riskScore?.toFixed(1) || '0.0'} disabled style={{ fontWeight: 'bold', color: BRAND_COLORS.primary }} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item name="complianceImpact" label="Compliance/Regulatory Impact">
                        <Input placeholder="Enter regulatory fines or warnings (if any)" disabled={isCaseCompleted} />
                      </Form.Item>

                      <Form.Item name="operationalDisruption" label="Operational Disruption details">
                        <Input placeholder="E.g., ATM downtime, queue congestion" disabled={isCaseCompleted} />
                      </Form.Item>

                      <Form.Item name="preventiveStrategy" label="Preventive/Mitigation Strategy">
                        <Input.TextArea rows={3} placeholder="Provide overview of long term strategies" disabled={isCaseCompleted} />
                      </Form.Item>

                      {!isCaseCompleted && (
                        <Button type="primary" htmlType="submit" loading={loading}>
                          Save Analysis Details
                        </Button>
                      )}
                    </Form>
                  </Card>

                  <Card title="5 Whys Iterative Analysis" style={{ marginTop: '24px' }}>
                    <Form
                      form={whysForm}
                      onFinish={handleWhysSubmit}
                      layout="vertical"
                    >
                      <Form.Item name="why1" label="1. Why did the issue occur?">
                        <Input placeholder="Direct cause" disabled={isCaseCompleted} />
                      </Form.Item>
                      <Form.Item name="why2" label="2. Why was that?">
                        <Input placeholder="First level explanation" disabled={isCaseCompleted} />
                      </Form.Item>
                      <Form.Item name="why3" label="3. Why did that happen?">
                        <Input placeholder="Second level explanation" disabled={isCaseCompleted} />
                      </Form.Item>
                      <Form.Item name="why4" label="4. Why was that?">
                        <Input placeholder="Third level explanation" disabled={isCaseCompleted} />
                      </Form.Item>
                      <Form.Item name="why5" label="5. What is the fundamental source?">
                        <Input placeholder="Fourth level explanation" disabled={isCaseCompleted} />
                      </Form.Item>
                      <Form.Item name="rootCauseStatement" label="Fundamental Root Cause Statement" rules={[{ required: true }]}>
                        <Input.TextArea rows={3} placeholder="Formulate the core root cause statement based on the 5 Whys analysis" disabled={isCaseCompleted} />
                      </Form.Item>

                      {!isCaseCompleted && (
                        <Button type="primary" htmlType="submit" style={{ background: '#b45309', borderColor: '#b45309' }} loading={loading}>
                          Update 5 Whys
                        </Button>
                      )}
                    </Form>
                  </Card>
                </Col>

                {/* Right Column: CAPA & Audit Trail */}
                <Col xs={24} lg={10}>
                  <Card
                    title="CAPA Actions Tracking"
                    extra={
                      !isCaseCompleted ? (
                        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddCapa}>
                          Add CAPA
                        </Button>
                      ) : null
                    }
                  >
                    <List
                      dataSource={selectedCase.capaActions || []}
                      renderItem={action => (
                        <List.Item
                          actions={
                            !isCaseCompleted ? [
                              <Button size="small" icon={<EditOutlined />} onClick={() => handleEditCapa(action)} />,
                              <Popconfirm title="Delete CAPA action?" onConfirm={() => handleDeleteCapa(action.id)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            ] : []
                          }
                        >
                        <List.Item.Meta
                          title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text strong style={{ fontSize: '13px' }}>{action.owner} ({action.actionType})</Text>
                              <Tag color={getStatusColor(action.implementationStatus)}>{action.implementationStatus}</Tag>
                            </div>
                          }
                          description={
                            <div style={{ marginTop: '6px' }}>
                              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: '4px', fontSize: '12px' }}>
                                {action.actionDescription}
                              </Paragraph>
                              {action.targetDate && (
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  Target: {moment(action.targetDate).format('MMM DD, YYYY')}
                                </div>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                    locale={{ emptyText: 'No CAPA actions defined. Click Add CAPA to create one.' }}
                  />
                </Card>

                <Card title="RCA Case History / Audit Trail" style={{ marginTop: '24px' }}>
                  <List
                    dataSource={auditLogs}
                    renderItem={log => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} />}
                          title={<Text strong style={{ fontSize: '12px' }}>{log.actor} - {log.action}</Text>}
                          description={
                            <div>
                              <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{moment(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                              <Text style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>{log.description}</Text>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                    locale={{ emptyText: 'No audit trail logs.' }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        );
        })()}
      </div>

      {/* CAPA Modal */}
      <Modal
        title={editingCapa ? 'Edit CAPA Action' : 'Add CAPA Action'}
        open={isCapaModalOpen}
        onCancel={() => setIsCapaModalOpen(false)}
        footer={null}
      >
        <Form form={capaForm} onFinish={handleCapaSubmit} layout="vertical">
          <Form.Item name="actionType" label="Action Type" rules={[{ required: true }]}>
            <Select>
              <Option value="CORRECTIVE">Corrective Action</Option>
              <Option value="PREVENTIVE">Preventive Action</Option>
            </Select>
          </Form.Item>

          <Form.Item name="actionDescription" label="Action Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Describe the action in detail" />
          </Form.Item>

          <Form.Item name="owner" label="Owner (Branch / Department)" rules={[{ required: true }]}>
            <Input placeholder="E.g., Bole Branch, IT Dept" />
          </Form.Item>

          <Form.Item name="targetDate" label="Target Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          {editingCapa && (
            <>
              <Form.Item name="implementationStatus" label="Implementation Status" rules={[{ required: true }]}>
                <Select>
                  <Option value="PENDING">Pending</Option>
                  <Option value="IN_PROGRESS">In Progress</Option>
                  <Option value="COMPLETED">Completed</Option>
                  <Option value="OVERDUE">Overdue</Option>
                </Select>
              </Form.Item>

              <Form.Item name="effectivenessRating" label="Effectiveness Rating">
                <Select placeholder="Rate after review">
                  <Option value="POOR">Poor</Option>
                  <Option value="SATISFACTORY">Satisfactory</Option>
                  <Option value="EXCELLENT">Excellent</Option>
                </Select>
              </Form.Item>

              <Form.Item name="verificationNotes" label="Verification / Review Notes">
                <Input.TextArea rows={2} placeholder="Explain how the effectiveness was validated" />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCapaModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Submit
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}

export default RcaDashboard;
