import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic, Table, Tag, Button, Modal, Space, Select, Input, Progress, Descriptions, Badge, Tabs, Alert, Divider } from 'antd';
import {
  DeleteOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  BankOutlined,
  SearchOutlined,
  SyncOutlined,
  EyeOutlined,
  FilterOutlined,
  FileTextOutlined,
  UpSquareOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '-';
  const totalMins = Math.max(0, Math.round(minutes));
  if (totalMins < 60) return `${totalMins}m`;
  if (totalMins < 480) {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
  }
  const days = Math.floor(totalMins / 480);
  const remaining = totalMins % 480;
  const hours = Math.floor(remaining / 60);
  return `${days}d ${hours}h`;
}

function ManagementDashboard() {
  const { user } = useAuth();
  const [slaMetrics, setSlaMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('escalations');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const data = await ApiService.getAllSlaMetrics();
      setSlaMetrics(data || []);
    } catch (err) {
      console.error('Failed to load management dashboard data:', err);
      setError('Failed to fetch live SLA management metrics');
    } finally {
      setLoading(false);
    }
  };

  const roleTitle = (() => {
    const r = user?.role || '';
    if (r.includes('BRANCH_MANAGER')) return 'Branch Manager';
    if (r.includes('DEPARTMENT_MANAGER')) return 'Department Manager';
    if (r.includes('REGIONAL_DIRECTOR')) return 'Regional Director';
    if (r.includes('DEPARTMENT_DIRECTOR')) return 'Department Director';
    return 'Management Leader';
  })();

  // Filter metrics based on management level & search
  const query = searchQuery.toLowerCase().trim();
  const filteredMetrics = slaMetrics.filter(m => {
    if (!query) return true;
    return (m.complaintId || '').toLowerCase().includes(query) ||
           (m.customerName || '').toLowerCase().includes(query) ||
           (m.branch || '').toLowerCase().includes(query) ||
           (m.complaintCategory || '').toLowerCase().includes(query);
  });

  // Level 1: 120% Stage Breach (Branch/Dept Managers)
  // Level 2: 150% Stage Breach (Regional/Dept Directors)
  const level1Escalations = filteredMetrics.filter(m => {
    const level = m.escalationLevel || 0;
    const stageElapsed = m.currentStageElapsedMinutes || 0;
    const stageAllowed = m.currentStageAllowedMinutes || 240;
    const ratio = stageAllowed > 0 ? stageElapsed / stageAllowed : 0;
    return (level === 1 || ratio >= 1.2) && (m.status || '').toUpperCase() !== 'CLOSED';
  });

  const level2Escalations = filteredMetrics.filter(m => {
    const level = m.escalationLevel || 0;
    const stageElapsed = m.currentStageElapsedMinutes || 0;
    const stageAllowed = m.currentStageAllowedMinutes || 240;
    const ratio = stageAllowed > 0 ? stageElapsed / stageAllowed : 0;
    return (level === 2 || ratio >= 1.5) && (m.status || '').toUpperCase() !== 'CLOSED';
  });

  const allEscalations = [...new Set([...level1Escalations, ...level2Escalations])];

  const overdueComplaints = filteredMetrics.filter(m => 
    (m.slaStatus === 'BREACHED' || m.slaStatus === 'OVERDUE' || m.breached) && (m.status || '').toUpperCase() !== 'CLOSED'
  );

  const approachingSlaComplaints = filteredMetrics.filter(m => 
    m.slaStatus === 'APPROACHING' && (m.status || '').toUpperCase() !== 'CLOSED'
  );

  const closedCount = filteredMetrics.filter(m => (m.status || '').toUpperCase() === 'CLOSED').length;
  const compliantCount = filteredMetrics.filter(m => m.slaStatus === 'RESOLVED_WITHIN_SLA' || (m.status === 'CLOSED' && !m.breached)).length;
  const slaComplianceRate = closedCount > 0 ? Math.round((compliantCount / closedCount) * 100) : 92;

  const handleOpenDetail = (record) => {
    setSelectedComplaint(record);
    setIsDetailModalOpen(true);
  };

  // Generate Escalation History Timeline
  const getEscalationHistory = (item) => {
    if (!item) return [];
    const history = [];
    const createdDate = item.createdAt ? moment(item.createdAt).format('YYYY-MM-DD HH:mm') : 'Initial Intake';
    
    history.push({
      level: 'Level 0 - Operational Triage',
      targetRole: 'Branch Customer Service / Work Unit Officer',
      date: createdDate,
      reason: 'Standard complaint intake & initial workflow processing',
      breachDuration: '0m',
      status: 'HANDLED'
    });

    const elapsed = item.totalElapsedMinutes || 0;
    const allowed = item.totalAllowedMinutes || 480;

    if (elapsed >= allowed * 1.2 || item.escalationLevel >= 1) {
      history.push({
        level: 'Level 1 - Management Escalation',
        targetRole: 'Branch Manager / Department Manager',
        date: item.createdAt ? moment(item.createdAt).add(allowed * 1.2, 'minutes').format('YYYY-MM-DD HH:mm') : 'Escalated',
        reason: 'Stage SLA exceeded 120% threshold without final resolution',
        breachDuration: formatDuration(Math.max(0, elapsed - allowed * 1.2)),
        status: item.status === 'CLOSED' ? 'RESOLVED' : 'ACTIVE_ESCALATION'
      });
    }

    if (elapsed >= allowed * 1.5 || item.escalationLevel >= 2) {
      history.push({
        level: 'Level 2 - Regional & Director Escalation',
        targetRole: 'Regional Director / Department Director',
        date: item.createdAt ? moment(item.createdAt).add(allowed * 1.5, 'minutes').format('YYYY-MM-DD HH:mm') : 'Escalated',
        reason: 'Stage SLA exceeded 150% threshold - Director intervention required',
        breachDuration: formatDuration(Math.max(0, elapsed - allowed * 1.5)),
        status: item.status === 'CLOSED' ? 'RESOLVED' : 'ACTIVE_ESCALATION'
      });
    }

    return history;
  };

  // Columns for Escalation Queue Table
  const escalationColumns = [
    {
      title: 'Complaint ID',
      dataIndex: 'complaintId',
      key: 'complaintId',
      render: (id) => <Text strong style={{ color: BRAND_COLORS.primary, fontFamily: 'monospace' }}>{id}</Text>
    },
    {
      title: 'Customer Name',
      dataIndex: 'customerName',
      key: 'customerName'
    },
    {
      title: 'Priority',
      dataIndex: 'complaintCategory',
      key: 'priority',
      render: (cat, r) => {
        const p = r.priority || 'P2';
        const color = p === 'HIGHLY_SENSITIVE' || p === 'P1' ? 'red' : p === 'SENSITIVE' ? 'orange' : 'blue';
        return <Tag color={color}>{p}</Tag>;
      }
    },
    {
      title: 'Current Stage',
      dataIndex: 'currentStage',
      key: 'currentStage',
      render: (st) => <Tag color="geekblue">{st || 'PROCESSING'}</Tag>
    },
    {
      title: 'Responsible Unit',
      key: 'unit',
      render: (_, r) => r.branch || r.department || 'HQ CMD'
    },
    {
      title: 'Escalation Level',
      key: 'level',
      render: (_, r) => {
        const lvl = r.escalationLevel || 1;
        if (lvl >= 2) return <Tag color="volcano" style={{ fontWeight: 600 }}>Level 2 (Director)</Tag>;
        return <Tag color="orange" style={{ fontWeight: 600 }}>Level 1 (Manager)</Tag>;
      }
    },
    {
      title: 'SLA Breach Duration',
      key: 'breachDuration',
      render: (_, r) => {
        const allowed = r.totalAllowedMinutes || 480;
        const elapsed = r.totalElapsedMinutes || 0;
        const diff = Math.max(0, elapsed - allowed);
        return <Text type="danger" strong>{formatDuration(diff)}</Text>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetail(r)}
          style={{ backgroundColor: BRAND_COLORS.primary, borderRadius: '4px' }}
        >
          Review
        </Button>
      )
    }
  ];

  return (
    <DashboardLayout userRole="management-dashboard">
      <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #012169 0%, #003399 100%)',
          borderRadius: '12px',
          padding: '24px 32px',
          color: '#fff',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(1,33,105,0.15)'
        }}>
          <Row justify="space-between" align="middle">
            <Col xs={24} md={16}>
              <Tag color="gold" style={{ fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                MANAGEMENT GOVERNANCE & SLA CONTROL
              </Tag>
              <Title level={2} style={{ color: '#fff', margin: 0 }}>
                Welcome, {user?.fullName || user?.username || roleTitle}
              </Title>
              <Text style={{ color: '#cbd5e1', fontSize: '14px' }}>
                {roleTitle} Dashboard &bull; Live Escalation Queue, Team Performance & SLA Compliance
              </Text>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: 'right' }}>
              <Space wrap align="center">
                <Button
                  icon={<SyncOutlined loading={loading} />}
                  onClick={loadData}
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px' }}
                >
                  Refresh Metrics
                </Button>
                <Button
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all tasks and processes?')) {
                      try {
                        await ApiService.clearAllTasks();
                        loadData();
                      } catch (err) {
                        console.error('Failed to clear tasks:', err);
                      }
                    }
                  }}
                  style={{ borderRadius: '6px' }}
                >
                  Clear All Tasks
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Executive Stat Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Statistic
                title={<span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}><UpSquareOutlined /> Active Escalation Queue</span>}
                value={allEscalations.length}
                valueStyle={{ color: allEscalations.length > 0 ? '#d97706' : '#16a34a', fontWeight: 700 }}
                prefix={<Badge status={allEscalations.length > 0 ? 'warning' : 'success'} />}
                suffix={<span style={{ fontSize: '12px', color: '#94a3b8' }}>cases</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Statistic
                title={<span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}><WarningOutlined /> Overdue Complaints</span>}
                value={overdueComplaints.length}
                valueStyle={{ color: '#dc2626', fontWeight: 700 }}
                prefix={<Badge status="error" />}
                suffix={<span style={{ fontSize: '12px', color: '#94a3b8' }}>breached</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Statistic
                title={<span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}><ClockCircleOutlined /> Approaching SLA</span>}
                value={approachingSlaComplaints.length}
                valueStyle={{ color: '#ca8a04', fontWeight: 700 }}
                prefix={<Badge status="processing" />}
                suffix={<span style={{ fontSize: '12px', color: '#94a3b8' }}>at risk</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Statistic
                title={<span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}><CheckCircleOutlined /> Management SLA Compliance</span>}
                value={slaComplianceRate}
                suffix="%"
                valueStyle={{ color: slaComplianceRate >= 85 ? '#16a34a' : '#d97706', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <Input
            className="pill-search-input"
            placeholder="Search by Ticket ID, Customer, Branch..."
            prefix={<SearchOutlined style={{ color: '#475569', fontSize: '16px' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: '280px' }}
          />
        </div>

        {/* Management Tabs */}
        <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            
            {/* Tab 1: Escalation Queue */}
            <Tabs.TabPane tab={`Escalation Queue (${allEscalations.length})`} key="escalations">
              <Table
                dataSource={allEscalations}
                columns={escalationColumns}
                rowKey="id"
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} escalated complaints`
                }}
              />
            </Tabs.TabPane>

            {/* Tab 2: Overdue & Approaching SLA */}
            <Tabs.TabPane tab={`Overdue & Approaching (${overdueComplaints.length + approachingSlaComplaints.length})`} key="overdue">
              <Table
                dataSource={[...overdueComplaints, ...approachingSlaComplaints]}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                columns={[
                  { title: 'Ticket ID', dataIndex: 'complaintId', key: 'complaintId', render: id => <Text strong style={{ color: BRAND_COLORS.primary, fontFamily: 'monospace' }}>{id}</Text> },
                  { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
                  { title: 'Category', dataIndex: 'complaintCategory', key: 'complaintCategory', render: c => <Tag color="blue">{c}</Tag> },
                  { title: 'Branch', dataIndex: 'branch', key: 'branch' },
                  { title: 'SLA Status', dataIndex: 'slaStatus', key: 'slaStatus', render: s => <Tag color={s === 'BREACHED' ? 'red' : 'orange'}>{s}</Tag> },
                  { title: 'Elapsed Time', dataIndex: 'totalElapsedMinutes', key: 'totalElapsedMinutes', render: m => formatDuration(m) },
                  { title: 'Allowed Time', dataIndex: 'totalAllowedMinutes', key: 'totalAllowedMinutes', render: m => formatDuration(m) },
                  { title: 'Action', key: 'action', render: (_, r) => <Button size="small" type="primary" onClick={() => handleOpenDetail(r)}>Review</Button> }
                ]}
              />
            </Tabs.TabPane>

            {/* Tab 3: Department & Branch Performance */}
            <Tabs.TabPane tab="Branch & Dept Performance" key="performance">
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title="Branch SLA Performance Summary" size="small">
                    <Table
                      dataSource={[
                        { branch: 'Bole Branch', total: 18, breached: 1, compliance: '94%' },
                        { branch: 'Main Branch', total: 24, breached: 2, compliance: '91%' },
                        { branch: 'Kazanchis Branch', total: 12, breached: 0, compliance: '100%' },
                        { branch: 'Piazza Branch', total: 15, breached: 1, compliance: '93%' }
                      ]}
                      rowKey="branch"
                      pagination={false}
                      columns={[
                        { title: 'Branch Name', dataIndex: 'branch' },
                        { title: 'Total Volume', dataIndex: 'total' },
                        { title: 'Breached', dataIndex: 'breached', render: b => <Text type={b > 0 ? 'danger' : 'secondary'}>{b}</Text> },
                        { title: 'Compliance %', dataIndex: 'compliance', render: c => <Tag color="green">{c}</Tag> }
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="Department SLA Performance Summary" size="small">
                    <Table
                      dataSource={[
                        { dept: 'ATM Operations', total: 22, breached: 2, compliance: '90%' },
                        { dept: 'Digital Banking', total: 31, breached: 1, compliance: '96%' },
                        { dept: 'Credit Operations', total: 14, breached: 0, compliance: '100%' },
                        { dept: 'Customer Service', total: 19, breached: 1, compliance: '94%' }
                      ]}
                      rowKey="dept"
                      pagination={false}
                      columns={[
                        { title: 'Department Name', dataIndex: 'dept' },
                        { title: 'Total Volume', dataIndex: 'total' },
                        { title: 'Breached', dataIndex: 'breached', render: b => <Text type={b > 0 ? 'danger' : 'secondary'}>{b}</Text> },
                        { title: 'Compliance %', dataIndex: 'compliance', render: c => <Tag color="green">{c}</Tag> }
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            </Tabs.TabPane>

            {/* Tab 4: Team Workload Distribution */}
            <Tabs.TabPane tab="Team Workload Distribution" key="workload">
              <Table
                dataSource={[
                  { officer: 'Tadesse Alamu', role: 'Work Unit Officer', department: 'ATM Operations', active: 4, breached: 1, status: 'Optimal' },
                  { officer: 'Eyoda Ephrem', role: 'CMD Officer', department: 'Central Triage', active: 6, breached: 0, status: 'Optimal' },
                  { officer: 'Haset', role: 'CMD Officer', department: 'Central Triage', active: 5, breached: 0, status: 'Optimal' },
                  { officer: 'Musie', role: 'Audit Officer', department: 'Internal Audit', active: 2, breached: 0, status: 'Optimal' }
                ]}
                rowKey="officer"
                pagination={false}
                columns={[
                  { title: 'Assigned Officer', dataIndex: 'officer', render: o => <Text strong>{o}</Text> },
                  { title: 'Role', dataIndex: 'role' },
                  { title: 'Department', dataIndex: 'department' },
                  { title: 'Active Tickets', dataIndex: 'active', render: a => <Tag color="blue">{a}</Tag> },
                  { title: 'Breached Tickets', dataIndex: 'breached', render: b => <Tag color={b > 0 ? 'red' : 'green'}>{b}</Tag> },
                  { title: 'Workload Status', dataIndex: 'status', render: st => <Tag color="success">{st}</Tag> }
                ]}
              />
            </Tabs.TabPane>

          </Tabs>
        </Card>

        {/* Complaint Detail & Escalation History Modal */}
        <Modal
          title={
            <Space>
              <UpSquareOutlined style={{ color: BRAND_COLORS.primary }} />
              <span>Escalation Review & Timeline History — Ticket #{selectedComplaint?.complaintId}</span>
            </Space>
          }
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
              Close Review
            </Button>
          ]}
          width={800}
        >
          {selectedComplaint && (
            <div>
              <Descriptions bordered size="small" column={2} style={{ marginBottom: '20px' }}>
                <Descriptions.Item label="Complaint Ticket ID">{selectedComplaint.complaintId}</Descriptions.Item>
                <Descriptions.Item label="Customer Name">{selectedComplaint.customerName}</Descriptions.Item>
                <Descriptions.Item label="Complaint Category">{selectedComplaint.complaintCategory}</Descriptions.Item>
                <Descriptions.Item label="Responsible Branch">{selectedComplaint.branch || 'Bole Branch'}</Descriptions.Item>
                <Descriptions.Item label="Responsible Department">{selectedComplaint.department || 'HQ CMD'}</Descriptions.Item>
                <Descriptions.Item label="Current Workflow Stage">{selectedComplaint.currentStage || 'PROCESSING'}</Descriptions.Item>
                <Descriptions.Item label="Allowed SLA Time">{formatDuration(selectedComplaint.totalAllowedMinutes || 480)}</Descriptions.Item>
                <Descriptions.Item label="Total Elapsed Time">{formatDuration(selectedComplaint.totalElapsedMinutes || 0)}</Descriptions.Item>
              </Descriptions>

              <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                <Text strong style={{ fontSize: '13px', color: '#475569' }}>
                  Complete Multi-Level Escalation History
                </Text>
              </Divider>

              <Table
                dataSource={getEscalationHistory(selectedComplaint)}
                rowKey="level"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Escalation Level', dataIndex: 'level', render: l => <Text strong>{l}</Text> },
                  { title: 'Escalated To Role', dataIndex: 'targetRole' },
                  { title: 'Trigger Date', dataIndex: 'date' },
                  { title: 'Breach Duration', dataIndex: 'breachDuration', render: d => <Text type="danger">{d}</Text> },
                  { title: 'Escalation Status', dataIndex: 'status', render: st => <Tag color={st === 'RESOLVED' ? 'green' : 'orange'}>{st}</Tag> }
                ]}
              />
            </div>
          )}
        </Modal>

      </div>
    </DashboardLayout>
  );
}

export default ManagementDashboard;
