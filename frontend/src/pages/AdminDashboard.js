import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, DatePicker, Select, Input, Space, Button, Alert, Progress, Descriptions, Statistic, Row, Col, Divider, Tooltip } from 'antd';
import { ReloadOutlined, FilterOutlined, DownloadOutlined, RightOutlined, DownOutlined, ClockCircleOutlined, WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined, DashboardOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import moment from 'moment';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// ─── SLA Status colors and icons ───
const SLA_STATUS_CONFIG = {
  ON_TIME: { color: '#52c41a', tag: 'green', icon: <CheckCircleOutlined />, label: 'On Time' },
  APPROACHING: { color: '#faad14', tag: 'orange', icon: <ExclamationCircleOutlined />, label: 'Approaching' },
  OVERDUE: { color: '#ff4d4f', tag: 'red', icon: <WarningOutlined />, label: 'Overdue' },
  BREACHED: { color: '#cf1322', tag: 'volcano', icon: <WarningOutlined />, label: 'Breached' },
};

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return '-';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return `${days}d ${remainHours}h`;
}

function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [slaMetrics, setSlaMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slaLoading, setSlaLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' or 'sla'
  const [expandedSlaData, setExpandedSlaData] = useState({}); // processInstanceId → SLA report

  // Filters
  const [filters, setFilters] = useState({
    action: undefined,
    actor: undefined,
    complaintId: '',
    dateRange: null
  });

  useEffect(() => {
    fetchLogs();
    fetchSlaMetrics();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const apiFilters = {};
      if (filters.action) apiFilters.action = filters.action;
      if (filters.actor) apiFilters.actor = filters.actor;
      if (filters.complaintId) apiFilters.complaintId = filters.complaintId;

      if (filters.dateRange && filters.dateRange.length === 2) {
        apiFilters.startDate = filters.dateRange[0].startOf('day').toISOString();
        apiFilters.endDate = filters.dateRange[1].endOf('day').toISOString();
      }

      const response = await ApiService.getAuditLogs(apiFilters);
      setLogs(response || []);
    } catch (err) {
      setError('Failed to load audit logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlaMetrics = async () => {
    try {
      setSlaLoading(true);
      const response = await ApiService.getAllSlaMetrics();
      setSlaMetrics(response || []);
    } catch (err) {
      console.error('Failed to load SLA metrics:', err);
    } finally {
      setSlaLoading(false);
    }
  };

  const fetchSlaReport = async (processInstanceId) => {
    try {
      const report = await ApiService.getSlaReport(processInstanceId);
      setExpandedSlaData(prev => ({ ...prev, [processInstanceId]: report }));
    } catch (err) {
      console.error('Failed to fetch SLA report:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      action: undefined,
      actor: undefined,
      complaintId: '',
      dateRange: null
    });
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;

    // Create a mapping for SLA metrics
    const slaMap = {};
    slaMetrics.forEach(m => { if (m.complaintId) slaMap[m.complaintId] = m; });

    const headers = [
      'Ticket ID', 'Process Instance ID', 'Task ID', 'Action', 'Actor', 'Actor ID',
      'Description', 'Customer Name', 'Customer Email', 'Complaint Category',
      'Complaint Description', 'Created At',
      'SLA Status', 'Total Elapsed Time', 'Remaining Time', 'Deadline',
      'Branch Staff Time', 'CMD Time', 'Audit Team Time', 'Work Unit Time', 'Service Quality Time'
    ];

    const csvData = logs.map(log => {
      const sla = slaMap[log.complaintId] || {};

      return [
        log.complaintId || 'N/A',
        log.processInstanceId || 'N/A',
        log.taskId || 'N/A',
        log.action || 'N/A',
        log.actor || 'N/A',
        log.actorId || 'N/A',
        `"${(log.description || '').replace(/"/g, '""')}"`,
        `"${(log.customerName || '').replace(/"/g, '""')}"`,
        `"${(log.customerEmail || '').replace(/"/g, '""')}"`,
        `"${(log.complaintCategory || '').replace(/"/g, '""')}"`,
        `"${(log.complaintDescription || '').replace(/"/g, '""')}"`,
        moment(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        // SLA Columns
        sla.slaStatus || 'N/A',
        formatDuration(sla.totalElapsedMinutes),
        formatDuration(sla.remainingMinutes),
        sla.deadline ? moment(sla.deadline).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
        formatDuration(sla.branchStaffDuration),
        formatDuration(sla.cmdDuration),
        formatDuration(sla.auditDuration),
        formatDuration(sla.departmentDuration),
        formatDuration(sla.serviceQualityDuration)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_sla_${moment().format('YYYYMMDD_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  // ─── Process logs to group by complaintId ───
  const groupedLogs = Object.values(logs.reduce((acc, log) => {
    const id = log.complaintId || 'unknown';
    if (!acc[id]) {
      acc[id] = {
        key: id,
        complaintId: id,
        processInstanceId: log.processInstanceId,
        latestAction: log.action,
        latestDate: log.createdAt,
        customerName: log.customerName || '',
        category: log.complaintCategory || '',
        description: log.complaintDescription || '',
        history: []
      };
    }
    acc[id].history.push(log);
    if (!acc[id].customerName && log.customerName) acc[id].customerName = log.customerName;
    if (!acc[id].category && log.complaintCategory) acc[id].category = log.complaintCategory;
    if (!acc[id].description && log.complaintDescription) acc[id].description = log.complaintDescription;
    if (moment(log.createdAt).isAfter(acc[id].latestDate)) {
      acc[id].latestAction = log.action;
      acc[id].latestDate = log.createdAt;
    }
    return acc;
  }, {}));

  groupedLogs.sort((a, b) => moment(b.latestDate).diff(moment(a.latestDate)));

  // ─── Merge SLA data into grouped logs ───
  const slaByComplaintId = {};
  slaMetrics.forEach(m => { if (m.complaintId) slaByComplaintId[m.complaintId] = m; });

  const mainColumns = [
    {
      title: 'Ticket ID',
      dataIndex: 'complaintId',
      key: 'complaintId',
      render: text => <strong style={{ color: BRAND_COLORS.primary }}>{text === 'unknown' ? 'N/A' : text}</strong>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: name => name ? name : <span style={{ color: '#aaa' }}>-</span>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: cat => cat ? <Tag color="cyan">{cat.toUpperCase()}</Tag> : <span style={{ color: '#aaa' }}>-</span>
    },
    {
      title: 'SLA Status',
      key: 'slaStatus',
      render: (_, record) => {
        const sla = slaByComplaintId[record.complaintId];
        if (!sla) return <span style={{ color: '#aaa' }}>-</span>;
        const config = SLA_STATUS_CONFIG[sla.slaStatus] || SLA_STATUS_CONFIG.ON_TIME;
        return (
          <Tooltip title={`Allowed: ${formatDuration(sla.totalAllowedMinutes)} | Elapsed: ${formatDuration(sla.totalElapsedMinutes)} | Remaining: ${formatDuration(sla.remainingMinutes)}`}>
            <Tag color={config.tag} icon={config.icon}>{config.label}</Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'SLA Time',
      key: 'slaTime',
      render: (_, record) => {
        const sla = slaByComplaintId[record.complaintId];
        if (!sla) return <span style={{ color: '#aaa' }}>-</span>;
        const percent = sla.totalAllowedMinutes > 0
          ? Math.min(100, Math.round((sla.totalElapsedMinutes / sla.totalAllowedMinutes) * 100))
          : 0;
        const strokeColor = percent > 100 ? '#ff4d4f' : percent > 80 ? '#faad14' : '#52c41a';
        return (
          <Tooltip title={`${formatDuration(sla.totalElapsedMinutes)} / ${formatDuration(sla.totalAllowedMinutes)}`}>
            <Progress percent={percent} size="small" strokeColor={strokeColor} style={{ width: 100 }} />
          </Tooltip>
        );
      }
    },
    {
      title: 'Current Status',
      dataIndex: 'latestAction',
      key: 'latestAction',
      render: action => {
        let color = 'blue';
        if (action === 'COMPLAINT_CREATED' || action === 'TICKET_GENERATED') color = 'green';
        if (action === 'CASE_CLOSED') color = 'gray';
        if (action?.includes('ERROR') || action?.includes('REJECTED')) color = 'red';
        if (action === 'NOTIFICATION_SENT') color = 'orange';
        return <Tag color={color}>{action}</Tag>;
      }
    },
    {
      title: 'Last Activity',
      dataIndex: 'latestDate',
      key: 'latestDate',
      render: date => moment(date).format('MMM DD, YYYY HH:mm')
    },
    {
      title: 'Actions',
      key: 'historyCount',
      render: (_, record) => <Tag>{record.history.length} Actions</Tag>
    }
  ];

  const expandedRowRender = (record) => {
    const sla = slaByComplaintId[record.complaintId];
    const slaReport = expandedSlaData[record.processInstanceId];

    // Fetch SLA report on expand if not cached
    if (record.processInstanceId && !slaReport) {
      fetchSlaReport(record.processInstanceId);
    }

    const historyColumns = [
      {
        title: 'Action',
        dataIndex: 'action',
        key: 'action',
        render: action => {
          let color = 'blue';
          if (action === 'COMPLAINT_CREATED' || action === 'TICKET_GENERATED') color = 'green';
          if (action === 'CASE_CLOSED') color = 'gray';
          if (action?.includes('ERROR') || action?.includes('REJECTED')) color = 'red';
          if (action === 'NOTIFICATION_SENT') color = 'orange';
          return <Tag color={color}>{action}</Tag>;
        }
      },
      {
        title: 'Actor',
        dataIndex: 'actor',
        key: 'actor',
        render: actor => <Tag>{actor === 'system' ? 'System' : actor}</Tag>
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
      },
      {
        title: 'Date & Time',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: date => moment(date).format('MMM DD, YYYY HH:mm:ss')
      }
    ];

    const taskTrackingColumns = [
      {
        title: 'Task',
        dataIndex: 'taskName',
        key: 'taskName',
        render: name => <Text strong>{name}</Text>
      },
      {
        title: 'Lane / Department',
        dataIndex: 'laneName',
        key: 'laneName',
        render: lane => {
          const laneColors = {
            'BRANCH_STAFF': 'blue', 'CONTACT_CENTER': 'cyan', 'CMD_OFFICER': 'purple',
            'AUDIT_TEAM': 'orange', 'DEPARTMENT_WORKUNIT': 'green', 'SERVICE_QUALITY': 'magenta',
            'CUSTOMER': 'default'
          };
          return <Tag color={laneColors[lane] || 'default'}>{(lane || '').replace(/_/g, ' ')}</Tag>;
        }
      },
      {
        title: 'Assigned To',
        dataIndex: 'assignedUser',
        key: 'assignedUser',
        render: user => user || '-'
      },
      {
        title: 'Started',
        dataIndex: 'startedAt',
        key: 'startedAt',
        render: dt => dt ? moment(dt).format('MMM DD HH:mm') : '-'
      },
      {
        title: 'Completed',
        dataIndex: 'completedAt',
        key: 'completedAt',
        render: dt => dt ? moment(dt).format('MMM DD HH:mm') : <Tag color="processing">In Progress</Tag>
      },
      {
        title: 'Duration',
        dataIndex: 'durationMinutes',
        key: 'durationMinutes',
        render: (min, rec) => {
          if (min === null || min === undefined) return <Tag color="processing">Active</Tag>;
          return <Text>{formatDuration(min)}</Text>;
        }
      }
    ];

    return (
      <div style={{ padding: '24px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #f0f0f0', marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: BRAND_COLORS.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClockCircleOutlined /> SLA Overview
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  { 
                    label: 'SLA Status', 
                    value: (SLA_STATUS_CONFIG[sla.slaStatus] || {}).label || sla.slaStatus, 
                    color: (SLA_STATUS_CONFIG[sla.slaStatus] || {}).color,
                    isTag: true 
                  },
                  { 
                    label: (
                      <Tooltip title="Maximum time allotted based on the complaint category">
                        Allowed Time <ClockCircleOutlined style={{ fontSize: '10px' }} />
                      </Tooltip>
                    ), 
                    value: formatDuration(sla.totalAllowedMinutes) 
                  },
                  { 
                    label: (
                      <Tooltip title="Total time passed since the complaint was created">
                        Elapsed Time <ClockCircleOutlined style={{ fontSize: '10px' }} />
                      </Tooltip>
                    ), 
                    value: formatDuration(sla.totalElapsedMinutes), 
                    color: sla.totalElapsedMinutes > sla.totalAllowedMinutes ? '#ff4d4f' : '#262626' 
                  },
                  { 
                    label: 'Remaining Time', 
                    value: formatDuration(sla.remainingMinutes), 
                    color: sla.remainingMinutes <= 0 ? '#ff4d4f' : '#52c41a' 
                  },
                ].map((item, idx) => (
                  <div key={idx} style={{ 
                    padding: '12px 16px', 
                    background: '#fafafa', 
                    borderRadius: '6px', 
                    border: '1px solid #f0f0f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: item.color || '#262626' }}>
                      {item.isTag ? (
                        <Tag color={(SLA_STATUS_CONFIG[sla.slaStatus] || {}).tag || 'default'} style={{ margin: 0 }}>{item.value}</Tag>
                      ) : item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: BRAND_COLORS.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DashboardOutlined /> Time Spent Per Department
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Branch Staff', value: slaReport?.laneMetrics?.branchStaffDuration ?? sla?.branchStaffDuration, color: '#1890ff' },
                    { label: 'CMD', value: slaReport?.laneMetrics?.cmdDuration ?? sla?.cmdDuration, color: '#722ed1' },
                    { label: 'Audit', value: slaReport?.laneMetrics?.auditDuration ?? sla?.auditDuration, color: '#fa8c16' },
                    { label: 'Work Unit', value: slaReport?.laneMetrics?.departmentDuration ?? sla?.departmentDuration, color: '#52c41a' },
                    { label: 'Service Quality', value: slaReport?.laneMetrics?.serviceQualityDuration ?? sla?.serviceQualityDuration, color: '#eb2f96' },
                  ].map((lane, idx) => (
                    <div key={idx} style={{ 
                      flex: '1 1 150px', 
                      background: '#fafafa', 
                      border: '1px solid #f0f0f0', 
                      borderLeft: `4px solid ${lane.color}`, 
                      padding: '12px 16px', 
                      borderRadius: '6px',
                    }}>
                      <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{lane.label}</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                        {formatDuration(lane.value || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

        {/* Task Time Tracking */}
        {slaReport && slaReport.taskTracking && slaReport.taskTracking.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: BRAND_COLORS.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClockCircleOutlined /> Individual Task Tracking
            </div>
            <Table
              columns={taskTrackingColumns}
              dataSource={slaReport.taskTracking}
              pagination={false}
              size="small"
              rowKey="taskId"
              scroll={{ x: 'max-content' }}
              style={{ marginBottom: '16px', border: '1px solid #f0f0f0', borderRadius: '8px' }}
            />
          </div>
        )}

        {/* Complaint Description */}
        <div style={{ marginBottom: '16px' }}>
          <strong style={{ color: BRAND_COLORS.primary }}>Original Complaint Description:</strong>
          <p style={{ marginTop: '8px', color: '#555', whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            {record.description || 'No detailed description available.'}
          </p>
        </div>

        {/* Audit Trail */}
        <strong style={{ display: 'block', marginBottom: '8px', color: BRAND_COLORS.primary }}>Audit Trail:</strong>
        <Table
          columns={historyColumns}
          dataSource={record.history.sort((a, b) => moment(b.createdAt).diff(moment(a.createdAt)))}
          pagination={false}
          size="small"
          rowKey="id"
          scroll={{ x: 'max-content' }}
          style={{ border: '1px solid #f0f0f0', borderRadius: '8px' }}
        />
      </div>
    );
  };

  const uniqueActions = [...new Set(logs.map(log => log.action).filter(Boolean))];
  const uniqueActors = [...new Set(logs.map(log => log.actor).filter(Boolean))];

  // ─── Real-time Analytics Calculations ───
  const totalComplaints = slaMetrics.length;
  const resolvedComplaints = slaMetrics.filter(m => m.resolvedAt !== null);
  const resolvedCount = resolvedComplaints.length;
  const activeCount = totalComplaints - resolvedCount;

  // SLA status for resolved complaints
  const resolvedOnTime = resolvedComplaints.filter(m => m.slaStatus === 'ON_TIME' || m.slaStatus === 'APPROACHING').length;
  const resolvedBreached = resolvedCount - resolvedOnTime;

  const categoriesMap = {
    financial: 'Financial',
    atm: 'ATM',
    technical: 'Technical',
    account: 'Account',
    loan: 'Loan',
    branch: 'Branch',
    mobile: 'Mobile',
    fraud: 'Fraud',
    general: 'General'
  };

  const categoryData = Object.keys(categoriesMap).map(key => {
    const count = slaMetrics.filter(m => m.complaintCategory === key).length;
    return {
      key,
      name: categoriesMap[key],
      count,
      percent: totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <DashboardLayout userRole="admin">
      <div style={{ padding: '12px 0', maxWidth: '100%', margin: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
            Audit Logs & SLA Dashboard
          </Title>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportToCSV}
              disabled={logs.length === 0}
            >
              Export CSV
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => { fetchLogs(); fetchSlaMetrics(); }}
              loading={loading || slaLoading}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        {/* Real-time Analytics Summary */}
        <div style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]}>
            {/* Volume Summary */}
            <Col xs={24} md={8}>
              <Card 
                title={<span style={{ fontWeight: 600, color: BRAND_COLORS.primary, display: 'flex', alignItems: 'center', gap: '8px' }}><DashboardOutlined /> Volume Summary</span>}
                bordered={true}
                style={{ height: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px', height: '100%', minHeight: '130px' }}>
                  {/* SVG Donut Chart */}
                  <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                    <svg width="100%" height="100%" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                      {/* Background circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        fill="transparent"
                        stroke="#f0f0f0"
                        strokeWidth="12"
                      />
                      {totalComplaints > 0 ? (
                        <>
                          {/* Resolved Segment */}
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="transparent"
                            stroke="#52c41a"
                            strokeWidth="12"
                            strokeDasharray={2 * Math.PI * 48}
                            strokeDashoffset={(2 * Math.PI * 48) - (resolvedCount / totalComplaints) * (2 * Math.PI * 48)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                          />
                          {/* Active Segment */}
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="transparent"
                            stroke="#1890ff"
                            strokeWidth="12"
                            strokeDasharray={2 * Math.PI * 48}
                            strokeDashoffset={(2 * Math.PI * 48) - (activeCount / totalComplaints) * (2 * Math.PI * 48)}
                            transform={`rotate(${(resolvedCount / totalComplaints) * 360} 60 60)`}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                          />
                        </>
                      ) : null}
                    </svg>
                    {/* Center Total Count Label */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: BRAND_COLORS.primary, lineHeight: 1 }}>
                        {totalComplaints}
                      </div>
                      <div style={{ fontSize: '9px', color: '#8c8c8c', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
                    </div>
                  </div>

                  {/* Legend Table/List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    {/* Resolved Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#3f8600', fontWeight: 500 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#52c41a' }}></span>
                        Resolved
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '13px', color: '#3f8600', display: 'block', lineHeight: 1.1 }}>{resolvedCount}</strong>
                        <span style={{ fontSize: '10px', color: '#52c41a' }}>
                          {totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    {/* Active Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#096dd9', fontWeight: 500 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1890ff' }}></span>
                        Active
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '13px', color: '#096dd9', display: 'block', lineHeight: 1.1 }}>{activeCount}</strong>
                        <span style={{ fontSize: '10px', color: '#1890ff' }}>
                          {totalComplaints > 0 ? Math.round((activeCount / totalComplaints) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Resolved SLA Performance */}
            <Col xs={24} md={8}>
              <Card 
                title={<span style={{ fontWeight: 600, color: BRAND_COLORS.primary, display: 'flex', alignItems: 'center', gap: '8px' }}><ClockCircleOutlined /> SLA Compliance (Resolved)</span>}
                bordered={true}
                style={{ height: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              >
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>On-Time Resolution Rate</span>
                  <strong style={{ fontSize: '18px', color: resolvedCount > 0 && (resolvedOnTime / resolvedCount) >= 0.8 ? '#52c41a' : '#faad14' }}>
                    {resolvedCount > 0 ? Math.round((resolvedOnTime / resolvedCount) * 100) : 0}%
                  </strong>
                </div>
                <Progress 
                  percent={resolvedCount > 0 ? Math.round((resolvedOnTime / resolvedCount) * 100) : 0} 
                  strokeColor={{ '0%': '#faad14', '100%': '#52c41a' }}
                  status="active"
                  style={{ marginBottom: '20px' }}
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#52c41a', display: 'inline-block' }}></span>
                      Resolved On-Time
                    </span>
                    <strong>{resolvedOnTime}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4f', display: 'inline-block' }}></span>
                      Resolved Breached / Overdue
                    </span>
                    <strong>{resolvedBreached}</strong>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Complaints by Category */}
            <Col xs={24} md={8}>
              <Card 
                title={<span style={{ fontWeight: 600, color: BRAND_COLORS.primary, display: 'flex', alignItems: 'center', gap: '8px' }}><FilterOutlined /> Complaints by Category</span>}
                bordered={true}
                bodyStyle={{ padding: '12px 24px 24px 24px' }}
                style={{ height: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              >
                <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                  {categoryData.filter(c => c.count > 0).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#bfbfbf' }}>No complaints registered yet</div>
                  ) : (
                    categoryData.filter(c => c.count > 0).map((cat, idx) => (
                      <div key={idx} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 500 }}>{cat.name}</span>
                          <span style={{ color: '#8c8c8c' }}>{cat.count} ({cat.percent}%)</span>
                        </div>
                        <Progress 
                          percent={cat.percent} 
                          size="small" 
                          showInfo={false} 
                          strokeColor={
                            cat.key === 'fraud' || cat.key === 'financial' ? '#cf1322' : 
                            cat.key === 'technical' || cat.key === 'mobile' ? '#1890ff' : '#fa8c16'
                          }
                        />
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Filters */}
        <Card
          title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FilterOutlined /> Filters</span>}
          style={{ marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        >
          <Space wrap size="large">
            <div>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>Ticket ID</div>
              <Input
                placeholder="Search Ticket ID"
                value={filters.complaintId}
                onChange={e => handleFilterChange('complaintId', e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
            </div>

            <div>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>Action Type</div>
              <Select
                placeholder="Filter by Action"
                value={filters.action}
                onChange={val => handleFilterChange('action', val)}
                style={{ width: 200 }}
                allowClear
              >
                {uniqueActions.map(action => (
                  <Option key={action} value={action}>{action}</Option>
                ))}
              </Select>
            </div>

            <div>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>Actor</div>
              <Select
                placeholder="Filter by Actor"
                value={filters.actor}
                onChange={val => handleFilterChange('actor', val)}
                style={{ width: 200 }}
                allowClear
              >
                {uniqueActors.map(actor => (
                  <Option key={actor} value={actor}>{actor === 'system' ? 'System' : actor}</Option>
                ))}
              </Select>
            </div>

            <div>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>Date Range</div>
              <RangePicker
                value={filters.dateRange}
                onChange={val => handleFilterChange('dateRange', val)}
              />
            </div>

            <div style={{ marginTop: '22px' }}>
              <Button onClick={clearFilters}>Clear All</Button>
            </div>
          </Space>
        </Card>

        {/* Main Table */}
        <div style={{ marginTop: '24px' }}>
          <Table
            columns={mainColumns}
            dataSource={groupedLogs}
            rowKey="key"
            loading={loading}
            expandable={{
              expandedRowRender,
              defaultExpandedRowKeys: [],
              expandIcon: ({ expanded, onExpand, record }) =>
                expanded ? (
                  <DownOutlined onClick={e => onExpand(record, e)} style={{ cursor: 'pointer', color: BRAND_COLORS.primary }} />
                ) : (
                  <RightOutlined onClick={e => onExpand(record, e)} style={{ cursor: 'pointer', color: BRAND_COLORS.primary }} />
                )
            }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
