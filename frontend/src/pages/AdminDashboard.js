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

  return (
    <DashboardLayout userRole="admin">
      <div style={{ padding: '12px 0', maxWidth: '100%', margin: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
            Audit Logs
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
