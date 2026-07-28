import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Alert, Form, Input, Checkbox, Space, Row, Col, Select, Progress, Tooltip, Divider, Tabs, Table } from 'antd';
import { DeleteOutlined, ArrowLeftOutlined, SettingOutlined, DashboardOutlined, DownloadOutlined, PaperClipOutlined, SearchOutlined, SyncOutlined, DatabaseOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import TaskCard from '../components/TaskCard';
import TaskTable from '../components/TaskTable';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

function CMDDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [districtsList, setDistrictsList] = useState([]);
  const [slaMetrics, setSlaMetrics] = useState([]);
  const [slaLoading, setSlaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all_tasks');
  const [completedPage, setCompletedPage] = useState(1);
  const [completedPageSize, setCompletedPageSize] = useState(10);
  const [slaPage, setSlaPage] = useState(1);
  const [slaPageSize, setSlaPageSize] = useState(10);
  const [formData, setFormData] = useState({
    priorityLevel: 'P2',
    requiresInvestigation: false,
    notes: '',
    district: '',
    branch: '',
    department: '',
    manager: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [clearingTasks, setClearingTasks] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState('');

  useEffect(() => {
    // Initial fetch
    loadTasks(true);
    fetchSlaMetrics(true);
    loadHierarchy();

    // Setup 5-second polling
    const interval = setInterval(() => {
      loadTasks(false);
      fetchSlaMetrics(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadHierarchy = async () => {
    try {
      const data = await ApiService.getHierarchy();
      setDistrictsList(data);
    } catch (err) {
      console.error('Failed to load hierarchy:', err);
    }
  };

  const fetchSlaMetrics = async (showLoading = false) => {
    try {
      if (showLoading === true) setSlaLoading(true);
      const data = await ApiService.getAllSlaMetrics();
      setSlaMetrics(data || []);
    } catch (err) {
      console.error('Failed to load SLA metrics:', err);
    } finally {
      if (showLoading === true) setSlaLoading(false);
    }
  };

  const loadTasks = async (showLoading = false) => {
    try {
      if (showLoading === true) setLoading(true);
      const tasksData = await ApiService.getEnrichedTasks();
      const cmdTasks = tasksData.filter(task =>
        task.definitionKey === 'FormTask_43'
      );
      // Sort: customer-rejected tasks first
      cmdTasks.sort((a, b) => {
        const aRejected = !!a.variables?.customerFeedbackComment || a.variables?.isSatisfied === false;
        const bRejected = !!b.variables?.customerFeedbackComment || b.variables?.isSatisfied === false;
        if (aRejected && !bRejected) return -1;
        if (!aRejected && bRejected) return 1;
        return 0;
      });
      setTasks(cmdTasks);

      if (selectedTask) {
        const updatedSelected = cmdTasks.find(t => t.id === selectedTask.id);
        if (updatedSelected) {
          setSelectedTask(updatedSelected);
        }
      }
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
        setFormData({
          priorityLevel: 'P2',
          requiresInvestigation: false,
          notes: '',
          district: '',
          branch: '',
          department: '',
          manager: ''
        });
        await loadTasks(true);
        await fetchSlaMetrics(true);

        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage('Failed to clear all tasks');
        console.error('Error clearing tasks:', error);
      } finally {
        setClearingTasks(false);
      }
    }
  };

  const getDepartmentForCategory = (category) => {
    switch (category) {
      case 'atm': return 'ATM Operations';
      case 'card': return 'Card Operations';
      case 'mobile':
      case 'internet_banking':
      case 'super_app':
        return 'Digital Banking';
      case 'loan':
      case 'credit':
        return 'Credit Department';
      case 'account':
      case 'transfer':
      case 'technical':
        return 'Operations Department';
      case 'employee_behaviour':
      case 'general':
        return 'Customer Experience';
      case 'fraud':
        return 'Fraud Investigation';
      default: return 'Customer Experience';
    }
  };

  const handleTaskSelect = async (task) => {
    setSelectedTask(task);
    setMessage('');
    const suggestedDept = getDepartmentForCategory(task.variables?.complaint?.category);
    setFormData({
      priorityLevel: 'P2',
      requiresInvestigation: false,
      notes: '',
      district: '',
      branch: '',
      department: suggestedDept,
      manager: ''
    });

    try {
      await loadTasks(false);
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

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDistrictChange = (value) => {
    setFormData(prev => ({
      ...prev,
      district: value,
      branch: '',
      manager: ''
    }));
  };

  const handleBranchChange = (value) => {
    const distObj = districtsList.find(d => d.name === formData.district);
    const branchObj = distObj?.branches.find(b => b.name === value);
    const deptObj = branchObj?.departments.find(d => d.name === formData.department);
    const manager = deptObj ? `${deptObj.managerName} (${deptObj.name})` : (branchObj ? branchObj.managerName : '');
    setFormData(prev => ({
      ...prev,
      branch: value,
      manager: manager
    }));
  };

  const handleDepartmentChange = (value) => {
    const distObj = districtsList.find(d => d.name === formData.district);
    const branchObj = distObj?.branches.find(b => b.name === formData.branch);

    if (!value) {
      setFormData(prev => ({
        ...prev,
        department: '',
        manager: branchObj ? branchObj.managerName : ''
      }));
      return;
    }

    const deptObj = branchObj?.departments.find(dept => dept.name === value);
    const manager = deptObj ? `${deptObj.managerName} (${deptObj.name})` : '';
    setFormData(prev => ({
      ...prev,
      department: value,
      manager: manager
    }));
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;

    // Validation: District and Branch are required ONLY when Requires Investigation is NOT checked.
    if (!formData.requiresInvestigation) {
      if (!formData.district || !formData.district.trim()) {
        setMessage('error: District is required for standard routing.');
        return;
      }
      if (!formData.branch || !formData.branch.trim()) {
        setMessage('error: Branch is required for standard routing.');
        return;
      }
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const variables = {
        complaintCategory: selectedTask.variables?.complaint?.category || 'general',
        priorityLevel: formData.priorityLevel,
        requiresInvestigation: formData.requiresInvestigation,
        notes: formData.notes || ''
      };

      // Only submit routing fields if Requires Investigation is false
      if (!formData.requiresInvestigation) {
        variables.district = formData.district;
        variables.branch = formData.branch;
        variables.department = formData.department || '';
        variables.manager = formData.manager || '';
      }

      await ApiService.completeTask(selectedTask.id, variables);
      setMessage('success: Task completed! Complaint categorized and routed successfully.');

      setFormData({
        priorityLevel: 'P2',
        requiresInvestigation: false,
        notes: '',
        district: '',
        branch: '',
        department: '',
        manager: ''
      });
      setSelectedTask(null);
      await loadTasks(true);
      await fetchSlaMetrics(true);
    } catch (error) {
      setMessage('error: Failed to complete task');
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
    <DashboardLayout userRole="cmd">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
              Hello, {user?.fullName || user?.username || ''}
            </Title>
            <Text type="secondary" style={{ fontSize: '15px' }}>
              Screen &amp; categorize complaints
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
            message={message.toLowerCase().includes('success') ? 'Success' : message.toLowerCase().includes('error') ? 'Error' : 'Information'}
            description={message.replace(/^(success|error):\s*/i, '')}
            type={message.toLowerCase().includes('success') ? 'success' : message.toLowerCase().includes('error') ? 'error' : 'info'}
            showIcon
            closable
            style={{ marginBottom: '24px' }}
            onClose={() => setMessage('')}
          />
        )}

        {/* Analytics Summary — hidden when a task is selected */}
        {!selectedTask && (() => {
          const activeTaskComplaintIds = new Set(tasks.map(t => t.complaintId).filter(Boolean));
          const activeSlaMetrics = slaMetrics.filter(m => activeTaskComplaintIds.has(m.complaintId));
          const totalComplaints = activeSlaMetrics.length;

          const categoriesMap = {
            financial: { label: 'Financial', color: '#cf1322' },
            atm: { label: 'ATM', color: '#1890ff' },
            technical: { label: 'Technical', color: '#722ed1' },
            account: { label: 'Account', color: '#52c41a' },
            loan: { label: 'Loan', color: '#fa8c16' },
            branch: { label: 'Branch', color: '#eb2f96' },
            mobile: { label: 'Mobile', color: '#13c2c2' },
            fraud: { label: 'Fraud', color: '#f5222d' },
            employee_behaviour: { label: 'Employee Behaviour', color: '#fa541c' },
            internet_banking: { label: 'Internet Banking', color: '#0050b3' },
            super_app: { label: 'Super App', color: '#ff4d4f' },
            general: { label: 'General', color: '#faad14' }
          };

          const categoryData = Object.keys(categoriesMap).map(key => {
            const count = activeSlaMetrics.filter(m => m.complaintCategory === key).length;
            return {
              key,
              name: categoriesMap[key].label,
              color: categoriesMap[key].color,
              count,
              percent: totalComplaints > 0 ? (count / totalComplaints) * 100 : 0
            };
          }).sort((a, b) => b.count - a.count);

          const radius = 48;
          const circumference = 2 * Math.PI * radius;
          let currentRotation = -90;

          return (
            <div style={{ marginBottom: '24px' }}>
              <Card
                title={<span style={{ fontWeight: 600, color: BRAND_COLORS.primary, display: 'flex', alignItems: 'center', gap: '8px' }}><DashboardOutlined /> Complaint Category Analytics</span>}
                bordered={true}
                loading={slaLoading}
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              >
                <Row gutter={[32, 24]} align="middle">
                  {/* Donut Chart */}
                  <Col xs={24} md={12} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
                      <svg width="100%" height="100%" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="transparent"
                          stroke="#f0f0f0"
                          strokeWidth="12"
                        />
                        {totalComplaints > 0 && categoryData.filter(c => c.count > 0).map((cat) => {
                          const strokeDashoffset = circumference - (cat.percent / 100) * circumference;
                          const rotation = currentRotation;
                          currentRotation += (cat.percent / 100) * 360;
                          return (
                            <Tooltip
                              key={cat.key}
                              title={<div style={{ textAlign: 'center' }}><strong>{cat.name}</strong><br />{cat.count} complaints ({Math.round(cat.percent)}%)</div>}
                              placement="top"
                            >
                              <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                fill="transparent"
                                stroke={cat.color}
                                strokeWidth="12"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                transform={`rotate(${rotation} 60 60)`}
                                strokeLinecap="round"
                                style={{
                                  transition: 'stroke-dashoffset 0.8s ease, transform 0.8s ease, stroke-width 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.setAttribute('stroke-width', '15');
                                }}
                                onMouseLeave={(e) => {
                                  e.target.setAttribute('stroke-width', '12');
                                }}
                              />
                            </Tooltip>
                          );
                        })}
                      </svg>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '26px', fontWeight: '800', color: BRAND_COLORS.primary, lineHeight: 1 }}>
                          {totalComplaints}
                        </div>
                        <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
                      </div>
                    </div>
                  </Col>

                  {/* Category Progress Breakdown */}
                  <Col xs={24} md={12} className="card-vertical-divider">
                    <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '8px' }}>
                      {categoryData.filter(c => c.count > 0).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#bfbfbf' }}>No active complaints in queue</div>
                      ) : (
                        categoryData.filter(c => c.count > 0).map((cat, idx) => (
                          <div key={idx} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, display: 'inline-block' }}></span>
                                {cat.name}
                              </span>
                              <span style={{ color: '#8c8c8c' }}>{cat.count} ({Math.round(cat.percent)}%)</span>
                            </div>
                            <Progress
                              percent={Math.round(cat.percent)}
                              size="small"
                              showInfo={false}
                              strokeColor={cat.color}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </Col>
                </Row>
              </Card>
            </div>
          );
        })()}

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
                  showPriority={false}
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
              {/* Left Column: Complaint & Investigation Info */}
              <Col xs={24} lg={13}>
                {/* Complaint Details Card */}
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
                      <Text style={{ color: '#64748b', fontSize: '14px' }}>Preferred Contact Method</Text>
                      <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>
                        {selectedTask.variables?.customer?.preferredContactMethod || 'Email'}
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

                {/* Audit Investigation Details Card if available */}
                {selectedTask.variables?.auditFindings && (
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '20px',
                    border: '1px solid #f1f5f9'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                        Audit Investigation Details
                      </Text>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Justification</Text>
                        <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500, textAlign: 'right', maxWidth: '280px' }}>
                          {selectedTask.variables.auditJustification || 'N/A'}
                        </Text>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Findings</Text>
                        <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500, textAlign: 'right', maxWidth: '280px' }}>
                          {selectedTask.variables.auditFindings || 'N/A'}
                        </Text>
                      </div>

                      {(selectedTask.variables?.auditAttachment || selectedTask.variables?.auditAttachmentName) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                          <Text style={{ color: '#64748b', fontSize: '14px' }}>Investigation Attachment</Text>
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
                )}
              </Col>
              <Col xs={24} lg={11}>
                {/* Customer Profile Card */}
                {selectedTask.variables?.customer && (
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '20px',
                    border: '1px solid #f1f5f9'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                        Customer Profile
                      </Text>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Customer Segment</Text>
                        <Tag color={selectedTask.variables.customer.customerSegment === 'Corporate' ? 'gold' : 'blue'} style={{ fontWeight: 600, margin: 0 }}>
                          {selectedTask.variables.customer.customerSegment || 'Retail'}
                        </Tag>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Customer Sub-Segment</Text>
                        <Tag color={selectedTask.variables.customer.customerSubSegment === 'Pensioner' ? 'cyan' : 'default'} style={{ fontWeight: 600, margin: 0 }}>
                          {selectedTask.variables.customer.customerSubSegment || 'Standard'}
                        </Tag>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Account Number</Text>
                        <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>
                          {selectedTask.variables.customer.accountNumber || 'N/A'}
                        </Text>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>Core Banking Risk Rating</Text>
                        <Tag color={selectedTask.variables.customer.riskRating === 'High Risk' ? 'red' : 'green'} style={{ fontWeight: 600, margin: 0 }}>
                          {selectedTask.variables.customer.riskRating || 'LOW'}
                        </Tag>
                      </div>
                    </div>
                  </div>
                )}

                {/* CMD Screening Card */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      CMD Screening
                    </Text>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <Form onFinish={handleSubmit} layout="vertical">
                      {selectedTask?.variables?.committeeDecision !== 'approved' && (
                        <Form.Item style={{ marginBottom: '16px' }}>
                          <Checkbox
                            name="requiresInvestigation"
                            checked={formData.requiresInvestigation}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                requiresInvestigation: checked,
                                ...(checked ? {
                                  district: '',
                                  branch: '',
                                  department: '',
                                  manager: ''
                                } : {})
                              }));
                            }}
                          >
                            <span style={{ fontWeight: 500, color: '#0f172a' }}>Requires Investigation</span>
                          </Checkbox>
                        </Form.Item>
                      )}

                      {!formData.requiresInvestigation && (
                        <>
                          <Form.Item label={<span style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>District</span>} required>
                            <Select
                              placeholder="Select District"
                              value={formData.district || undefined}
                              onChange={handleDistrictChange}
                              style={{ width: '100%' }}
                            >
                              {districtsList.map(dist => (
                                <Option key={dist.id} value={dist.name}>{dist.name}</Option>
                              ))}
                            </Select>
                          </Form.Item>

                          <Form.Item label={<span style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>Branch</span>} required>
                            <Select
                              placeholder="Select Branch"
                              value={formData.branch || undefined}
                              onChange={handleBranchChange}
                              disabled={!formData.district}
                              style={{ width: '100%' }}
                            >
                              {formData.district && districtsList.find(d => d.name === formData.district)?.branches.map(br => (
                                <Option key={br.id} value={br.name}>{br.name} ({br.code})</Option>
                              ))}
                            </Select>
                          </Form.Item>

                          {formData.branch && (
                            <Row gutter={16}>
                              <Col span={12}>
                                <Form.Item label={<span style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>Department (Optional)</span>}>
                                  <Select
                                    placeholder="Select Department"
                                    value={formData.department || undefined}
                                    onChange={handleDepartmentChange}
                                    style={{ width: '100%' }}
                                    allowClear
                                  >
                                    {districtsList
                                      .find(d => d.name === formData.district)
                                      ?.branches.find(b => b.name === formData.branch)
                                      ?.departments.map(dept => (
                                        <Option key={dept.id} value={dept.name}>{dept.name}</Option>
                                      ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label={<span style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>Department / Branch Manager</span>}>
                                  <Input
                                    value={formData.manager}
                                    readOnly
                                    placeholder="Manager will be populated automatically"
                                    style={{ backgroundColor: '#f5f5f5', color: '#000000d9', borderRadius: '6px' }}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          )}

                          <Form.Item label={<span style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>Priority Level</span>} required>
                            <Select
                              value={formData.priorityLevel}
                              onChange={(value) => handleSelectChange('priorityLevel', value)}
                              style={{ width: '100%' }}
                            >
                              <Option value="P1">P1 - Critical</Option>
                              <Option value="P2">P2 - High</Option>
                              <Option value="P3">P3 - Medium</Option>
                              <Option value="P4">P4 - Low</Option>
                            </Select>
                          </Form.Item>
                        </>
                      )}

                      <Form.Item label={<span style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>Notes / Comments</span>}>
                        <Input.TextArea
                          name="notes"
                          value={formData.notes}
                          onChange={(e) => handleFormChange(e)}
                          rows={4}
                          placeholder="Enter screening notes or comments..."
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Item>

                      <div style={{ marginTop: '24px' }}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={isSubmitting}
                          size="large"
                          style={{ width: '100%', borderRadius: '8px', height: '44px', fontWeight: 600 }}
                        >
                          {isSubmitting ? 'Processing...' : 'Screen and Assign'}
                        </Button>
                      </div>
                    </Form>
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

export default CMDDashboard;
