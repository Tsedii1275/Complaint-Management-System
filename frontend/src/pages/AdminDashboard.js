import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, DatePicker, Select, Input, Space, Button, Alert, Progress, Descriptions, Statistic, Row, Col, Divider, Tooltip, Tabs, Modal, Dropdown, message } from 'antd';
import { ReloadOutlined, FilterOutlined, DownloadOutlined, RightOutlined, DownOutlined, ClockCircleOutlined, WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined, DashboardOutlined, PieChartOutlined, LineChartOutlined, FileTextOutlined, EyeOutlined, FileExcelOutlined, SettingOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
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
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '-';
  const totalMins = Math.max(0, Math.round(minutes));
  if (totalMins < 60) return `${totalMins}m`;
  if (totalMins < 480) {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
  }
  const days = Math.floor(totalMins / 480);
  const remainingAfterDays = totalMins % 480;
  const hours = Math.floor(remainingAfterDays / 60);
  const mins = remainingAfterDays % 60;
  return `${days}d ${hours}h` + (mins > 0 ? ` ${mins}m` : '');
}

function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [slaMetrics, setSlaMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'category', 'branch', 'district', 'channel', 'audit'
  const [expandedSlaData, setExpandedSlaData] = useState({});

  // Advanced KPIs
  const [stats, setStats] = useState({
    totalCount: 0,
    closedCount: 0,
    fcrCount: 0,
    avgResolutionTime: 0,
    fcrRate: 0,
    slaComplianceRate: 0,
    overdueCount: 0
  });

  // Trend and Reports list
  const [trendData, setTrendData] = useState([]);
  const [reportsData, setReportsData] = useState([]);
  const [trendInterval, setTrendInterval] = useState('daily');
  const [districts, setDistricts] = useState([]);

  // Drill down modal state
  const [drillDownVisible, setDrillDownVisible] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownData, setDrillDownData] = useState([]);

  // SLA Governance Config state
  const [isSlaConfigModalOpen, setIsSlaConfigModalOpen] = useState(false);
  const [slaConfigs, setSlaConfigs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [editingSlaConfig, setEditingSlaConfig] = useState(null);
  const [newAllowedMins, setNewAllowedMins] = useState('');

  // Advanced Filters
  const [filters, setFilters] = useState({
    complaintId: '',
    category: undefined,
    branch: undefined,
    district: undefined,
    channel: undefined,
    status: undefined,
    slaStatus: undefined,
    fcrStatus: undefined,
    dateRange: null
  });

  // User Management State
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'ROLE_BRANCH_MANAGER',
    district: '',
    branch: '',
    department: '',
    enabled: true
  });

  useEffect(() => {
    fetchHierarchy();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await ApiService.get('/api/users');
      setUsersList(data || []);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserFormData({
      fullName: '',
      username: '',
      email: '',
      password: '',
      role: 'ROLE_BRANCH_MANAGER',
      district: '',
      branch: '',
      department: '',
      enabled: true
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role || 'ROLE_BRANCH_MANAGER',
      district: user.district || '',
      branch: user.branch || '',
      department: user.department || '',
      enabled: user.enabled !== false
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await ApiService.put(`/api/users/${editingUser.id}`, userFormData);
        message.success('User updated successfully');
      } else {
        await ApiService.post('/api/users', userFormData);
        message.success('User created successfully');
      }
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err) {
      message.error(err.message || 'Failed to save user');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      await ApiService.put(`/api/users/${userId}/status`);
      message.success('User status updated');
      fetchUsers();
    } catch (err) {
      message.error('Failed to toggle user status');
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, trendInterval]);

  const fetchHierarchy = async () => {
    try {
      const data = await ApiService.get('/api/hierarchy');
      setDistricts(data || []);
    } catch (err) {
      console.error("Failed to load hierarchy:", err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const apiFilters = {};
      if (filters.complaintId) apiFilters.complaintId = filters.complaintId;
      if (filters.category) apiFilters.category = filters.category;
      if (filters.branch) apiFilters.branch = filters.branch;
      if (filters.district) apiFilters.district = filters.district;
      if (filters.channel) apiFilters.channel = filters.channel;
      if (filters.status) apiFilters.status = filters.status;
      if (filters.slaStatus) apiFilters.slaStatus = filters.slaStatus;
      if (filters.fcrStatus !== undefined && filters.fcrStatus !== null) apiFilters.fcrStatus = filters.fcrStatus;

      if (filters.dateRange && filters.dateRange.length === 2) {
        apiFilters.startDate = filters.dateRange[0].startOf('day').toISOString();
        apiFilters.endDate = filters.dateRange[1].endOf('day').toISOString();
      }

      // Fetch stats
      const statsRes = await ApiService.getAnalyticsStats(apiFilters);
      setStats(statsRes);

      // Fetch trend
      const trendRes = await ApiService.getAnalyticsTrend(trendInterval, apiFilters);
      setTrendData(trendRes || []);

      // Fetch reports list
      const reportsRes = await ApiService.getAnalyticsReports(apiFilters);
      setReportsData(reportsRes || []);

      // Keep SLA metrics for main/audit views
      const slaRes = await ApiService.getAllSlaMetrics();
      setSlaMetrics(slaRes || []);

      // Keep audit logs for original audit logs tab
      const auditRes = await ApiService.getAuditLogs(apiFilters);
      setLogs(auditRes || []);

    } catch (err) {
      setError('Failed to load analytics dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
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
      complaintId: '',
      category: undefined,
      branch: undefined,
      district: undefined,
      channel: undefined,
      status: undefined,
      slaStatus: undefined,
      fcrStatus: undefined,
      dateRange: null
    });
  };

  // CSV/Excel Export
  const handleExport = async (format) => {
    try {
      const apiFilters = {};
      if (filters.complaintId) apiFilters.complaintId = filters.complaintId;
      if (filters.category) apiFilters.category = filters.category;
      if (filters.branch) apiFilters.branch = filters.branch;
      if (filters.district) apiFilters.district = filters.district;
      if (filters.channel) apiFilters.channel = filters.channel;
      if (filters.status) apiFilters.status = filters.status;
      if (filters.slaStatus) apiFilters.slaStatus = filters.slaStatus;
      if (filters.fcrStatus !== undefined && filters.fcrStatus !== null) apiFilters.fcrStatus = filters.fcrStatus;

      if (filters.dateRange && filters.dateRange.length === 2) {
        apiFilters.startDate = filters.dateRange[0].startOf('day').toISOString();
        apiFilters.endDate = filters.dateRange[1].endOf('day').toISOString();
      }

      const blob = await ApiService.exportAnalyticsData(format, apiFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `complaints_report_${moment().format('YYYYMMDD_HHmmss')}.${format === 'csv' ? 'csv' : 'xls'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Failed to export report.");
    }
  };

  // PDF print trigger
  const handlePrintPDF = () => {
    window.print();
  };

  // Dynamic CSV/Excel Export for Selected Tab
  const exportTabData = (tabKey, format = 'csv') => {
    try {
      let headers = [];
      let rows = [];
      let filename = 'Report';

      if (tabKey === 'all') {
        filename = 'All_Complaints_Report';
        headers = ['Ticket ID', 'Customer Name', 'Category', 'Branch', 'District', 'Channel', 'Status', 'SLA Status', 'Resolution Time (mins)', 'FCR Status', 'Created At'];
        rows = reportsData.map(r => [
          r.complaintId || '',
          r.customerName || '',
          (r.complaintCategory || '').toUpperCase(),
          r.branch || '',
          r.district || '',
          (r.channel || '').toUpperCase(),
          r.status || '',
          r.slaStatus || '',
          r.resolvedAt ? moment(r.resolvedAt).diff(moment(r.createdAt), 'minutes') : '-',
          r.fcrStatus ? 'FCR' : 'Standard',
          r.createdAt ? moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : ''
        ]);
      } else if (tabKey === 'category') {
        filename = 'Complaints_by_Category_Report';
        headers = ['Category', 'Total Complaints', 'Active Complaints', 'Closed Complaints', 'FCR Count', 'SLA Compliant', 'SLA Compliance Rate'];
        rows = getCategorizedReports().map(r => {
          const rate = r.closed > 0 ? Math.round((r.slaCompliant / r.closed) * 100) + '%' : 'N/A';
          return [(r.key || '').toUpperCase(), r.total, r.active, r.closed, r.fcrCount, r.slaCompliant, rate];
        });
      } else if (tabKey === 'branch') {
        filename = 'Complaints_by_Branch_Report';
        headers = ['Branch', 'District', 'Total Complaints', 'Active Complaints', 'Closed Complaints', 'FCR Count', 'SLA Compliant', 'SLA Compliance Rate'];
        rows = getBranchReports().map(r => {
          const rate = r.closed > 0 ? Math.round((r.slaCompliant / r.closed) * 100) + '%' : 'N/A';
          return [r.branch, r.district, r.total, r.active, r.closed, r.fcrCount, r.slaCompliant, rate];
        });
      } else if (tabKey === 'district') {
        filename = 'Complaints_by_District_Report';
        headers = ['District', 'Total Complaints', 'Active Complaints', 'Closed Complaints', 'FCR Count', 'SLA Compliant', 'SLA Compliance Rate'];
        rows = getDistrictReports().map(r => {
          const rate = r.closed > 0 ? Math.round((r.slaCompliant / r.closed) * 100) + '%' : 'N/A';
          return [r.district, r.total, r.active, r.closed, r.fcrCount, r.slaCompliant, rate];
        });
      } else if (tabKey === 'channel') {
        filename = 'Complaints_by_Channel_Report';
        headers = ['Channel', 'Total Complaints', 'Active Complaints', 'Closed Complaints', 'FCR Count', 'SLA Compliant', 'SLA Compliance Rate'];
        rows = getChannelReports().map(r => {
          const rate = r.closed > 0 ? Math.round((r.slaCompliant / r.closed) * 100) + '%' : 'N/A';
          return [(r.channel || '').toUpperCase(), r.total, r.active, r.closed, r.fcrCount, r.slaCompliant, rate];
        });
      } else if (tabKey === 'audit') {
        filename = 'Audit_Action_Log_Report';
        headers = ['Ticket ID', 'Customer Name', 'Category', 'Branch', 'District', 'Channel', 'Status', 'SLA Status', 'Total Audit Events', 'Latest Action', 'Latest Actor', 'Created At'];
        rows = groupedLogs.map(r => {
          const latestHistory = r.history && r.history.length > 0 ? r.history[0] : {};
          return [
            r.complaintId || '',
            r.customerName || '',
            (r.complaintCategory || '').toUpperCase(),
            r.branch || '',
            r.district || '',
            (r.channel || '').toUpperCase(),
            r.status || '',
            r.slaStatus || '',
            r.history ? r.history.length : 0,
            latestHistory.action || '',
            latestHistory.actor || '',
            r.createdAt ? moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : ''
          ];
        });
      }

      const csvContent = [
        headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
        ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const mimeType = format === 'excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
      const extension = format === 'excel' ? 'xls' : 'csv';

      const blob = new Blob(['\ufeff' + csvContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${moment().format('YYYYMMDD_HHmmss')}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Tab export failed:", err);
      setError("Failed to export selected report.");
    }
  };



  // Drill down logic
  const handleDrillDown = (dimension, value) => {
    let filtered = [];
    let title = '';
    if (dimension === 'category') {
      filtered = reportsData.filter(m => m.complaintCategory === value);
      title = `Complaints - Category: ${value.toUpperCase()}`;
    } else if (dimension === 'branch') {
      filtered = reportsData.filter(m => m.branch === value);
      title = `Complaints - Branch: ${value}`;
    } else if (dimension === 'district') {
      filtered = reportsData.filter(m => m.district === value);
      title = `Complaints - District: ${value}`;
    } else if (dimension === 'channel') {
      filtered = reportsData.filter(m => m.channel === value);
      title = `Complaints - Channel: ${value}`;
    } else if (dimension === 'chart') {
      filtered = reportsData.filter(m => {
        const periodStr = moment(m.createdAt).format(
          trendInterval === 'daily' ? 'YYYY-MM-DD' :
          trendInterval === 'weekly' ? 'YYYY-[W]ww' :
          trendInterval === 'monthly' ? 'YYYY-MM' : 'YYYY'
        );
        return periodStr === value;
      });
      title = `Complaints - Period: ${value}`;
    }
    setDrillDownData(filtered);
    setDrillDownTitle(title);
    setDrillDownVisible(true);
  };

  // Helper lists for filters
  const uniqueCategories = [
    'atm', 'card', 'mobile', 'fraud', 'account', 'loan', 'transfer', 'technical', 'employee_behaviour', 'internet_banking', 'super_app', 'general'
  ];

  const uniqueChannels = ['web', 'branch', 'contact_center', 'voice', 'email', 'social_media'];

  const uniqueBranches = districts.flatMap(d => d.branches || []).map(b => b.name);
  const uniqueDistricts = districts.map(d => d.name);

  // SLA status breakdown calculations for rendering KPI colors
  const complianceRate = Math.round(stats.slaComplianceRate);



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

  // ─── Human-readable status labels ───
  const STATUS_LABEL_MAP = {
    'COMPLAINT_CREATED': { label: 'New ', color: 'green' },
    'TICKET_GENERATED': { label: 'New ', color: 'green' },
    'TASK_ASSIGNED': { label: 'Process Assigned', color: 'blue' },
    'TASK_COMPLETED': { label: 'Process Assigned', color: 'blue' },
    'TASK_STARTED': { label: 'Process Assigned', color: 'blue' },
    'CMD_CLASSIFICATION': { label: 'Process Assigned', color: 'blue' },
    'NOTIFICATION_SENT': { label: 'Solved', color: 'cyan' },
    'FCR_RESOLVED': { label: 'Resolved at Branch (FCR)', color: 'lime' },
    'CASE_CLOSED': { label: 'Closed', color: 'gray' },
    'FCR_DECISION': { label: 'FCR Decision Made', color: 'purple' },
    'INVESTIGATION_COMPLETED': { label: 'Investigation Done', color: 'orange' },
    'RESOLUTION_COMPLETED': { label: 'Resolution Complete', color: 'cyan' },
    'COMMITTEE_DECISION': { label: 'Committee Decision', color: 'volcano' },
  };

  const getStatusTag = (action) => {
    const mapped = STATUS_LABEL_MAP[action];
    if (mapped) return <Tag color={mapped.color}>{mapped.label}</Tag>;
    // Fallback for unmapped actions
    let color = 'blue';
    if (action?.includes('ERROR') || action?.includes('REJECTED')) color = 'red';
    return <Tag color={color}>{action}</Tag>;
  };

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
      title: 'Current Status',
      dataIndex: 'latestAction',
      key: 'latestAction',
      render: action => getStatusTag(action)
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
        render: action => getStatusTag(action)
      },
      {
        title: 'Actor',
        dataIndex: 'actorId',
        key: 'actorId',
        render: (actorId, record) => {
          if (!actorId || actorId === 'system' || actorId === 'web') {
            return <Tag>{record.actor === 'system' ? 'System' : record.actor}</Tag>;
          }
          return <Tag color="blue">{actorId}</Tag>;
        }
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
        title: 'Assigned To',
        dataIndex: 'assignedUser',
        key: 'assignedUser',
        render: user => {
          if (!user || user === 'initiator' || user === 'system') return '-';
          return user;
        }
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
              <DashboardOutlined /> Time Spent Per Stage
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

  // Dynamic Aggregation for reports
  const getCategorizedReports = () => {
    const map = {};
    reportsData.forEach(m => {
      const cat = m.complaintCategory || 'general';
      if (!map[cat]) map[cat] = { key: cat, total: 0, closed: 0, active: 0, fcrCount: 0, slaCompliant: 0 };
      map[cat].total++;
      if ((m.status || '').toUpperCase() === 'CLOSED') {
        map[cat].closed++;
        if (m.fcrStatus === true) map[cat].fcrCount++;
        if (m.slaStatus === 'ON_TIME' || m.slaStatus === 'APPROACHING') map[cat].slaCompliant++;
      } else {
        map[cat].active++;
      }
    });
    return Object.values(map);
  };

  const getBranchReports = () => {
    const map = {};
    reportsData.forEach(m => {
      const br = m.branch || 'Unknown Branch';
      if (!map[br]) map[br] = { key: br, branch: br, district: m.district || 'Unknown District', total: 0, closed: 0, active: 0, fcrCount: 0, slaCompliant: 0 };
      map[br].total++;
      if ((m.status || '').toUpperCase() === 'CLOSED') {
        map[br].closed++;
        if (m.fcrStatus === true) map[br].fcrCount++;
        if (m.slaStatus === 'ON_TIME' || m.slaStatus === 'APPROACHING') map[br].slaCompliant++;
      } else {
        map[br].active++;
      }
    });
    return Object.values(map);
  };

  const getDistrictReports = () => {
    const map = {};
    reportsData.forEach(m => {
      const dist = m.district || 'Unknown District';
      if (!map[dist]) map[dist] = { key: dist, district: dist, total: 0, closed: 0, active: 0, fcrCount: 0, slaCompliant: 0 };
      map[dist].total++;
      if ((m.status || '').toUpperCase() === 'CLOSED') {
        map[dist].closed++;
        if (m.fcrStatus === true) map[dist].fcrCount++;
        if (m.slaStatus === 'ON_TIME' || m.slaStatus === 'APPROACHING') map[dist].slaCompliant++;
      } else {
        map[dist].active++;
      }
    });
    return Object.values(map);
  };

  const getChannelReports = () => {
    const map = {};
    reportsData.forEach(m => {
      const chan = m.channel || 'web';
      if (!map[chan]) map[chan] = { key: chan, channel: chan, total: 0, closed: 0, active: 0, fcrCount: 0, slaCompliant: 0 };
      map[chan].total++;
      if ((m.status || '').toUpperCase() === 'CLOSED') {
        map[chan].closed++;
        if (m.fcrStatus === true) map[chan].fcrCount++;
        if (m.slaStatus === 'ON_TIME' || m.slaStatus === 'APPROACHING') map[chan].slaCompliant++;
      } else {
        map[chan].active++;
      }
    });
    return Object.values(map);
  };

  // Render SVG Trend line chart
  const renderTrendChart = () => {
    if (trendData.length === 0) {
      return <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>No data points available for trend</div>;
    }
    const maxVal = Math.max(...trendData.map(d => d.count), 5);
    const height = 150;
    const width = 800;
    const padding = 20;

    const points = trendData.map((d, i) => {
      const x = padding + (i * (width - 2 * padding)) / Math.max(trendData.length - 1, 1);
      const y = height - padding - (d.count * (height - 2 * padding)) / maxVal;
      return { x, y, label: d.period, val: d.count };
    });

    const dPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
          const y = padding + r * (height - 2 * padding);
          return (
            <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f0f0f0" strokeDasharray="3" />
          );
        })}
        <path d={dPath} fill="none" stroke={BRAND_COLORS.primary} strokeWidth="2.5" />
        {points.map((p, idx) => (
          <g key={idx} style={{ cursor: 'pointer' }} onClick={() => handleDrillDown('chart', p.label)}>
            <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke={BRAND_COLORS.primary} strokeWidth="2.5" />
            <title>{`Period: ${p.label}\nComplaints: ${p.val}`}</title>
            {(idx === 0 || idx === Math.floor(points.length / 2) || idx === points.length - 1) && (
              <text x={p.x} y={height - 4} fontSize="9px" textAnchor="middle" fill="#888">{p.label}</text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  const reportColumns = (dimension) => [
    {
      title: dimension.charAt(0).toUpperCase() + dimension.slice(1),
      dataIndex: 'key',
      render: val => <span style={{ fontWeight: 'bold' }}>{val.toUpperCase()}</span>
    },
    {
      title: 'Total Complaints',
      dataIndex: 'total',
      sorter: (a, b) => a.total - b.total
    },
    {
      title: 'Closed Cases',
      dataIndex: 'closed'
    },
    {
      title: 'Active Cases',
      dataIndex: 'active'
    },
    {
      title: 'First Contact Res. (FCR %)',
      render: (_, r) => <span>{r.closed > 0 ? ((r.fcrCount * 100) / r.closed).toFixed(1) : '0.0'}%</span>
    },
    {
      title: 'SLA Compliance Rate (%)',
      render: (_, r) => <span>{r.closed > 0 ? ((r.slaCompliant * 100) / r.closed).toFixed(1) : '100.0'}%</span>
    },
    {
      title: 'Actions',
      render: (_, r) => (
        <Tooltip title="Drill Down">
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => handleDrillDown(dimension, r.key)} />
        </Tooltip>
      )
    }
  ];

  return (
    <DashboardLayout userRole="admin">
      <style>{printStyles}</style>
      <div style={{ padding: '12px 0', maxWidth: '100%', margin: '0' }} id="print-section">
        
        {/* Header Title & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
            Complaint Analytics & Reports
          </Title>
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>Export CSV</Button>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport('excel')}>Export Excel</Button>
            <Button icon={<FileTextOutlined />} onClick={handlePrintPDF}>Export PDF / Print</Button>
          </Space>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        {/* Enhanced KPI Cards */}
        <div style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Statistic
                  title={<span style={{ color: '#888', fontSize: '13px' }}><ClockCircleOutlined /> Average Resolution Time (ART)</span>}
                  value={formatDuration(stats.avgResolutionTime)}
                  valueStyle={{ color: BRAND_COLORS.primary, fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Statistic
                  title={<span style={{ color: '#888', fontSize: '13px' }}><CheckCircleOutlined /> First Contact Resolution (FCR)</span>}
                  value={`${stats.fcrRate.toFixed(1)}%`}
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Statistic
                  title={<span style={{ color: '#888', fontSize: '13px' }}><ExclamationCircleOutlined /> SLA Compliance Rate</span>}
                  value={`${stats.slaComplianceRate.toFixed(1)}%`}
                  valueStyle={{ color: complianceRate >= 80 ? '#52c41a' : complianceRate >= 50 ? '#faad14' : '#ff4d4f', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Statistic
                  title={<span style={{ color: '#888', fontSize: '13px' }}>Overdue Complaints</span>}
                  value={stats.overdueCount}
                  valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Trend Analysis Section */}
        <Card title={<span style={{ fontWeight: 600, color: BRAND_COLORS.primary }}><LineChartOutlined /> Complaint Volume Trend Analysis</span>} style={{ marginBottom: '24px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <Select value={trendInterval} onChange={setTrendInterval} style={{ width: 120 }}>
              <Option value="daily">Daily</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
              <Option value="yearly">Yearly</Option>
            </Select>
          </div>
          {renderTrendChart()}
        </Card>

        {/* Advanced Filters */}
        <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'transparent' }}>
          <Space wrap size="large">
            <div>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>Ticket ID</div>
              <Input placeholder="Search Ticket" value={filters.complaintId} onChange={e => handleFilterChange('complaintId', e.target.value)} allowClear style={{ width: 150 }} />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>Status</div>
              <Select placeholder="All Status" value={filters.status} onChange={val => handleFilterChange('status', val)} allowClear style={{ width: 120 }}>
                <Option value="IN_PROGRESS">Active</Option>
                <Option value="CLOSED">Closed</Option>
              </Select>
            </div>
            <div>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>Date Range</div>
              <RangePicker value={filters.dateRange} onChange={val => handleFilterChange('dateRange', val)} />
            </div>
            <div style={{ marginTop: '22px' }}>
              <Button type="link" icon={<SyncOutlined />} onClick={clearFilters}>Reset Filters</Button>
            </div>
          </Space>
        </div>

        {/* Report Views (Tabs) */}
        <Card bodyStyle={{ padding: '8px 16px' }} style={{ borderRadius: '8px' }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            tabBarExtraContent={
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'csv',
                      label: 'Export CSV (.csv)',
                      icon: <DownloadOutlined />,
                      onClick: () => exportTabData(activeTab, 'csv')
                    },
                    {
                      key: 'excel',
                      label: 'Export Excel (.xls)',
                      icon: <FileExcelOutlined />,
                      onClick: () => exportTabData(activeTab, 'excel')
                    }
                  ]
                }}
                trigger={['click']}
              >
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  style={{ borderRadius: '6px', backgroundColor: BRAND_COLORS.primary, borderColor: BRAND_COLORS.primary }}
                >
                  Export <DownOutlined />
                </Button>
              </Dropdown>
            }
          >
            <Tabs.TabPane tab="All Complaints" key="all">
              <Table
                columns={[
                  { title: 'Ticket ID', dataIndex: 'complaintId', key: 'complaintId', render: t => <strong style={{ color: BRAND_COLORS.primary }}>{t}</strong> },
                  { title: 'Customer Name', dataIndex: 'customerName' },
                  { title: 'Category', dataIndex: 'complaintCategory', render: c => <Tag color="blue">{c?.toUpperCase()}</Tag> },
                  { title: 'Branch', dataIndex: 'branch' },
                  { title: 'District', dataIndex: 'district' },
                  { title: 'Channel', dataIndex: 'channel', render: ch => <Tag color="cyan">{ch?.toUpperCase()}</Tag> },
                  { title: 'Status', dataIndex: 'status', render: st => <Tag color={st === 'CLOSED' ? 'gray' : 'green'}>{st}</Tag> },
                  { title: 'SLA Status', dataIndex: 'slaStatus', render: sla => <Tag color={sla === 'ON_TIME' ? 'green' : sla === 'OVERDUE' ? 'red' : 'orange'}>{sla}</Tag> },
                  {
                    title: 'Resolution Time',
                    render: (_, r) => {
                      if (!r.resolvedAt) return '-';
                      return formatDuration(moment(r.resolvedAt).diff(moment(r.createdAt), 'minutes'));
                    }
                  },
                  { title: 'FCR Status', dataIndex: 'fcrStatus', render: f => <Tag color={f ? 'lime' : 'blue'}>{f ? 'FCR' : 'Standard'}</Tag> }
                ]}
                dataSource={reportsData}
                rowKey="complaintId"
                loading={loading}
                pagination={{ pageSize: 15 }}
                scroll={{ x: 'max-content' }}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Complaints by Category" key="category">
              <Table columns={reportColumns('category')} dataSource={getCategorizedReports()} rowKey="key" pagination={false} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Complaints by Branch" key="branch">
              <Table
                columns={reportColumns('branch')}
                dataSource={getBranchReports()}
                rowKey="key"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 25, 50, 100],
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} branches`
                }}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Complaints by District" key="district">
              <Table columns={reportColumns('district')} dataSource={getDistrictReports()} rowKey="key" pagination={false} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Complaints by Channel" key="channel">
              <Table columns={reportColumns('channel')} dataSource={getChannelReports()} rowKey="key" pagination={false} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Audit Action Log (Original)" key="audit">
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
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 25, 50, 100],
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} logs`
                }}
                scroll={{ x: 'max-content' }}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="User & Role Management" key="user_management">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Text strong style={{ fontSize: '15px' }}>Bank Staff, Leadership & Executive User Accounts</Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateUser} style={{ backgroundColor: BRAND_COLORS.primary, borderRadius: '6px' }}>
                  + Add New User
                </Button>
              </div>

              <Table
                dataSource={usersList}
                rowKey="id"
                loading={usersLoading}
                pagination={{ pageSize: 10 }}
                columns={[
                  { title: 'Full Name', dataIndex: 'fullName', key: 'fullName', render: name => <Text strong>{name}</Text> },
                  { title: 'Username', dataIndex: 'username', key: 'username', render: u => <Text style={{ fontFamily: 'monospace' }}>{u}</Text> },
                  { title: 'Email', dataIndex: 'email', key: 'email' },
                  {
                    title: 'Assigned Role',
                    dataIndex: 'role',
                    key: 'role',
                    render: role => {
                      let color = 'blue';
                      if (role?.includes('MANAGER') || role?.includes('DIRECTOR')) color = 'gold';
                      if (role?.includes('CHIEF') || role?.includes('EXECUTIVE') || role?.includes('CEO')) color = 'purple';
                      if (role?.includes('ADMIN')) color = 'red';
                      return <Tag color={color}>{role}</Tag>;
                    }
                  },
                  {
                    title: 'Unit Assignment',
                    key: 'unit',
                    render: (_, r) => r.branch || r.department || r.district || 'Enterprise Wide'
                  },
                  {
                    title: 'Status',
                    dataIndex: 'enabled',
                    key: 'status',
                    render: enabled => enabled !== false ? <Tag color="success">Active</Tag> : <Tag color="default">Inactive</Tag>
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, r) => (
                      <Space>
                        <Button size="small" onClick={() => handleOpenEditUser(r)}>Edit</Button>
                        <Button size="small" type={r.enabled !== false ? 'danger' : 'default'} onClick={() => handleToggleUserStatus(r.id)}>
                          {r.enabled !== false ? 'Deactivate' : 'Activate'}
                        </Button>
                      </Space>
                    )
                  }
                ]}
              />
            </Tabs.TabPane>
          </Tabs>
        </Card>

        {/* User Management Modal */}
        <Modal
          title={editingUser ? `Edit User — ${editingUser.username}` : "Create New Staff / Leadership User"}
          open={isUserModalOpen}
          onOk={handleSaveUser}
          onCancel={() => setIsUserModalOpen(false)}
          okText={editingUser ? "Save Changes" : "Create User"}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>Full Name</Text>
              <Input
                placeholder="e.g. Solomon Regional Director"
                value={userFormData.fullName}
                onChange={e => setUserFormData({ ...userFormData, fullName: e.target.value })}
              />
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>Username</Text>
              <Input
                placeholder="e.g. rdirector"
                disabled={!!editingUser}
                value={userFormData.username}
                onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
              />
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>Email Address</Text>
              <Input
                placeholder="e.g. rdirector@dashenbank.com"
                value={userFormData.email}
                onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
              />
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>Password {editingUser ? '(leave blank to keep unchanged)' : ''}</Text>
              <Input.Password
                placeholder="password123"
                value={userFormData.password}
                onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
              />
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>Assigned Leadership / Staff Role</Text>
              <Select
                style={{ width: '100%' }}
                value={userFormData.role}
                onChange={role => setUserFormData({ ...userFormData, role })}
              >
                <Select.OptGroup label="Management Roles">
                  <Option value="ROLE_BRANCH_MANAGER">Branch Manager</Option>
                  <Option value="ROLE_DEPARTMENT_MANAGER">Department Manager</Option>
                  <Option value="ROLE_REGIONAL_DIRECTOR">Regional Director</Option>
                  <Option value="ROLE_DEPARTMENT_DIRECTOR">Department Director</Option>
                </Select.OptGroup>
                <Select.OptGroup label="Executive Roles">
                  <Option value="ROLE_CHIEF_BANKING_OFFICER">Chief Banking Officer</Option>
                  <Option value="ROLE_CHIEF_OPERATIONS_OFFICER">Chief Operations Officer</Option>
                  <Option value="ROLE_EXECUTIVE_COMMITTEE">Executive Committee Member</Option>
                  <Option value="ROLE_CEO_OFFICE">CEO Office</Option>
                </Select.OptGroup>
                <Select.OptGroup label="Operational Roles">
                  <Option value="ROLE_BRANCH_STAFF">Branch Staff</Option>
                  <Option value="ROLE_CMD_OFFICER">CMD Officer</Option>
                  <Option value="ROLE_AUDIT_TEAM">Audit Team</Option>
                  <Option value="ROLE_DEPARTMENT_WORKUNIT">Department Work Unit</Option>
                  <Option value="ROLE_SERVICE_QUALITY">Service Quality</Option>
                  <Option value="ROLE_ADMIN">Administrator</Option>
                </Select.OptGroup>
              </Select>
            </div>
            <Row gutter={12}>
              <Col span={12}>
                <Text style={{ fontSize: '12px', color: '#666' }}>District</Text>
                <Input
                  placeholder="Central District"
                  value={userFormData.district}
                  onChange={e => setUserFormData({ ...userFormData, district: e.target.value })}
                />
              </Col>
              <Col span={12}>
                <Text style={{ fontSize: '12px', color: '#666' }}>Branch</Text>
                <Input
                  placeholder="Bole Branch"
                  value={userFormData.branch}
                  onChange={e => setUserFormData({ ...userFormData, branch: e.target.value })}
                />
              </Col>
            </Row>
          </div>
        </Modal>
      </div>

      {/* Drill-down Modal */}
      <Modal
        title={<div style={{ color: BRAND_COLORS.primary, fontWeight: 600, fontSize: '18px' }}>{drillDownTitle}</div>}
        visible={drillDownVisible}
        onCancel={() => setDrillDownVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDrillDownVisible(false)}>
            Close
          </Button>
        ]}
        width={1200}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Table
          columns={[
            { 
              title: 'Ticket ID', 
              dataIndex: 'complaintId', 
              key: 'complaintId', 
              width: 220,
              render: t => <strong style={{ color: BRAND_COLORS.primary, fontFamily: 'monospace', fontSize: '12px' }}>{t}</strong> 
            },
            { 
              title: 'Customer Name', 
              dataIndex: 'customerName',
              width: 150,
              render: name => name || <span style={{ color: '#aaa' }}>-</span>
            },
            { 
              title: 'Category', 
              dataIndex: 'complaintCategory', 
              width: 130,
              render: c => c ? <Tag color="blue">{c.toUpperCase()}</Tag> : <span style={{ color: '#aaa' }}>-</span> 
            },
            { 
              title: 'Branch', 
              dataIndex: 'branch',
              width: 140,
              render: b => b || <span style={{ color: '#aaa' }}>-</span>
            },
            { 
              title: 'District', 
              dataIndex: 'district',
              width: 140,
              render: d => d || <span style={{ color: '#aaa' }}>-</span>
            },
            { 
              title: 'Channel', 
              dataIndex: 'channel', 
              width: 120,
              render: ch => ch ? <Tag color="cyan">{ch.toUpperCase()}</Tag> : <span style={{ color: '#aaa' }}>-</span> 
            },
            { 
              title: 'Status', 
              dataIndex: 'status', 
              width: 120,
              render: st => {
                const isClosed = (st || '').toUpperCase() === 'CLOSED';
                return <Tag color={isClosed ? 'default' : 'processing'}>{isClosed ? 'CLOSED' : 'ACTIVE'}</Tag>;
              }
            },
            { 
              title: 'SLA Status', 
              dataIndex: 'slaStatus', 
              width: 130,
              render: sla => {
                const config = SLA_STATUS_CONFIG[sla] || { tag: 'default', label: sla || '-' };
                return <Tag color={config.tag}>{config.label}</Tag>;
              }
            },
            { 
              title: 'FCR Status', 
              dataIndex: 'fcrStatus', 
              width: 130,
              render: f => <Tag color={f ? 'lime' : 'blue'}>{f ? 'FCR' : 'Standard'}</Tag> 
            }
          ]}
          dataSource={drillDownData}
          rowKey="complaintId"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [10, 25, 50, 100],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} complaints`
          }}
          scroll={{ x: 'max-content' }}
        />
      </Modal>

      {/* SLA Governance Configuration Modal */}
      <Modal
        title={<div style={{ color: BRAND_COLORS.primary, fontWeight: 600, fontSize: '18px' }}><SettingOutlined /> Dashen Bank Centralized SLA Configuration & Governance</div>}
        open={isSlaConfigModalOpen}
        onCancel={() => setIsSlaConfigModalOpen(false)}
        width={1000}
        footer={[
          <Button key="reset" danger onClick={async () => {
            if (window.confirm('Reset all SLA configurations to Dashen Bank defaults?')) {
              try {
                await ApiService.resetSlaConfigs();
                message.success('SLA Configurations reset to Dashen Bank defaults.');
                const cfgs = await ApiService.getSlaConfigs();
                setSlaConfigs(cfgs);
              } catch (e) {
                message.error('Failed to reset SLA configs.');
              }
            }
          }}>
            Reset Defaults
          </Button>,
          <Button key="close" type="primary" onClick={() => setIsSlaConfigModalOpen(false)}>
            Close
          </Button>
        ]}
      >
        <Tabs defaultActiveKey="matrix">
          <Tabs.TabPane tab="Stage & Priority SLA Matrix" key="matrix">
            <Table
              dataSource={slaConfigs}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              columns={[
                { title: 'Configuration Name', dataIndex: 'displayName', render: t => <strong style={{ color: BRAND_COLORS.primary }}>{t}</strong> },
                { title: 'Group', dataIndex: 'configGroup', render: g => <Tag color="blue">{g}</Tag> },
                { title: 'Priority', dataIndex: 'priority', render: p => <Tag color={p === 'HIGHLY_SENSITIVE' ? 'red' : p === 'SENSITIVE' ? 'orange' : 'green'}>{p}</Tag> },
                { title: 'Allowed Business Mins', dataIndex: 'allowedMinutes', render: m => <strong>{m} mins</strong> },
                {
                  title: 'Equivalent Time',
                  render: (_, r) => {
                    const mins = r.allowedMinutes || 0;
                    if (mins < 60) return `${mins} mins`;
                    if (mins < 480) return `${(mins / 60).toFixed(1)} Hours`;
                    return `${(mins / 480).toFixed(1)} Business Days (8h/day)`;
                  }
                },
                {
                  title: 'Action',
                  render: (_, r) => (
                    <Button size="small" type="primary" onClick={() => {
                      setEditingSlaConfig(r);
                      setNewAllowedMins(r.allowedMinutes);
                    }}>
                      Edit SLA
                    </Button>
                  )
                }
              ]}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Business Working Hours & Holidays" key="business_hours">
            <Card title="Dashen Bank Standard Working Hours Schedule" style={{ marginBottom: '16px' }}>
              <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
                <li><strong>Monday – Thursday:</strong> 08:00 AM – 12:00 PM & 01:00 PM – 05:00 PM (8 Hours / Day)</li>
                <li><strong>Friday:</strong> 08:00 AM – 11:30 AM & 01:00 PM – 05:00 PM (7.5 Hours / Day)</li>
                <li><strong>Saturday:</strong> 08:00 AM – 12:00 PM (4 Hours / Day)</li>
                <li><strong>Sunday & Holidays:</strong> Excluded (SLA timers pause automatically)</li>
              </ul>
            </Card>

            <Card title="Public & Bank Holidays Calendar">
              <Table
                dataSource={holidays}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: 'Holiday Name', dataIndex: 'holidayName', render: n => <strong>{n}</strong> },
                  { title: 'Date', dataIndex: 'holidayDate', render: d => <Tag color="volcano">{d}</Tag> },
                  { title: 'Type', dataIndex: 'holidayType', render: t => <Tag color="purple">{t}</Tag> }
                ]}
              />
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Modal>

      {/* Edit Single SLA Modal */}
      <Modal
        title={`Edit SLA: ${editingSlaConfig?.displayName || ''}`}
        open={!!editingSlaConfig}
        onCancel={() => setEditingSlaConfig(null)}
        onOk={async () => {
          if (!editingSlaConfig) return;
          try {
            await ApiService.updateSlaConfig(editingSlaConfig.id, { allowedMinutes: parseInt(newAllowedMins) });
            message.success('SLA Configuration updated successfully.');
            setEditingSlaConfig(null);
            const cfgs = await ApiService.getSlaConfigs();
            setSlaConfigs(cfgs);
          } catch (e) {
            message.error('Failed to update SLA config.');
          }
        }}
      >
        {editingSlaConfig && (
          <div>
            <p><strong>Config Key:</strong> {editingSlaConfig.configKey}</p>
            <p><strong>Priority Level:</strong> {editingSlaConfig.priority}</p>
            <div style={{ marginTop: '16px' }}>
              <label>Allowed Business Minutes:</label>
              <Input
                type="number"
                value={newAllowedMins}
                onChange={e => setNewAllowedMins(e.target.value)}
                style={{ marginTop: '8px' }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Note: 240 mins = 4 Hours, 480 mins = 1 Business Day, 1440 mins = 3 Business Days.
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

const printStyles = `
  @media print {
    body * {
      visibility: hidden !important;
    }
    #print-section, #print-section * {
      visibility: visible !important;
    }
    #print-section {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .ant-btn, .ant-select, .ant-picker-range, .ant-input, button, .ant-tabs-nav {
      display: none !important;
    }
  }
`;

export default AdminDashboard;
