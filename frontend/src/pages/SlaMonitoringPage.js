import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic, Progress, Table, Tag, Button, Input, Select, DatePicker, Tabs, Alert, Modal, Tooltip, Space, message } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, WarningOutlined, ExclamationCircleOutlined, AlertOutlined, DownloadOutlined, FileTextOutlined, SearchOutlined, SyncOutlined, EyeOutlined, TeamOutlined, BankOutlined, FilterOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import SlaTimelineComponent from '../components/SlaTimelineComponent';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

function SlaMonitoringPage() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [slaStatusFilter, setSlaStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [dateRange, setDateRange] = useState(null);

  // Timeline Modal
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ApiService.getAllSlaMetrics();
      setMetrics(data || []);
    } catch (err) {
      console.error('Failed to load SLA metrics:', err);
      setError('Failed to load SLA metrics from server.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered List
  const filteredMetrics = metrics.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (m.complaintId && m.complaintId.toLowerCase().includes(q)) ||
      (m.customerName && m.customerName.toLowerCase().includes(q)) ||
      (m.branch && m.branch.toLowerCase().includes(q)) ||
      (m.department && m.department.toLowerCase().includes(q));

    const matchesPriority = !priorityFilter || (m.priority && m.priority.toUpperCase() === priorityFilter.toUpperCase());
    const matchesCategory = !categoryFilter || (m.complaintCategory && m.complaintCategory.toLowerCase() === categoryFilter.toLowerCase());
    const matchesSlaStatus = !slaStatusFilter || (m.slaStatus && m.slaStatus.toUpperCase() === slaStatusFilter.toUpperCase());
    const matchesDistrict = !districtFilter || (m.district && m.district.toLowerCase().includes(districtFilter.toLowerCase()));

    let matchesDate = true;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const created = moment(m.createdAt);
      matchesDate = created.isAfter(dateRange[0].startOf('day')) && created.isBefore(dateRange[1].endOf('day'));
    }

    return matchesSearch && matchesPriority && matchesCategory && matchesSlaStatus && matchesDistrict && matchesDate;
  });

  // KPI Calculations
  const total = filteredMetrics.length;
  const active = filteredMetrics.filter(m => m.status?.toUpperCase() !== "CLOSED").length;
  const onTrack = filteredMetrics.filter(m => m.slaStatus?.toUpperCase() === "ON_TRACK" || m.slaStatus?.toUpperCase() === "ON_TIME").length;
  const approaching = filteredMetrics.filter(m => m.slaStatus?.toUpperCase() === "APPROACHING").length;
  const breached = filteredMetrics.filter(m => Boolean(m.breached) || m.slaStatus?.toUpperCase() === "BREACHED" || m.slaStatus?.toUpperCase() === "OVERDUE").length;
  const escalated = filteredMetrics.filter(m => m.slaStatus?.toUpperCase() === "ESCALATED" || (m.escalationLevel && m.escalationLevel > 0)).length;

  const closedCount = filteredMetrics.filter(m => m.status?.toUpperCase() === "CLOSED").length;
  const resolvedWithinSla = filteredMetrics.filter(m => m.slaStatus?.toUpperCase() === "RESOLVED_WITHIN_SLA" || (m.status?.toUpperCase() === "CLOSED" && !m.breached)).length;

  const complianceRate = total > 0 
    ? Math.round(((total - breached) / total) * 100 * 10) / 10 
    : 100;

  // Average Durations
  const avgElapsedMins = total > 0 
    ? Math.round(filteredMetrics.reduce((acc, m) => acc + (m.totalElapsedMinutes || 0), 0) / total)
    : 0;

  const formatMins = (mins) => {
    if (mins === null || mins === undefined) return '—';
    const num = Number(mins);
    if (isNaN(num) || num <= 0) return '0 Secs';
    if (num < 1) {
      const secs = Math.round(num * 60);
      return secs > 0 ? `${secs} Secs` : '0 Secs';
    }
    if (num < 60) return `${Math.round(num)} Mins`;
    if (num < 480) return `${(num / 60).toFixed(1)} Hours`;
    return `${(num / 480).toFixed(1)} Days`;
  };

  // Export Data to CSV
  const exportCSV = () => {
    if (filteredMetrics.length === 0) {
      message.warning('No data to export.');
      return;
    }

    const headers = ['Complaint ID', 'Customer Name', 'Priority', 'Category', 'Workflow Stage', 'Branch', 'District', 'Department', 'SLA Status', 'Total Elapsed', 'Breached', 'Escalation Level', 'Created At'];
    const rows = filteredMetrics.map(m => [
      `"${m.complaintId || ''}"`,
      `"${m.customerName || ''}"`,
      `"${m.priority || ''}"`,
      `"${m.complaintCategory || ''}"`,
      `"${m.currentStage || ''}"`,
      `"${m.branch || ''}"`,
      `"${m.district || ''}"`,
      `"${m.department || ''}"`,
      `"${m.slaStatus || ''}"`,
      `"${formatMins(m.totalElapsedMinutes)}"`,
      `"${m.breached ? 'Yes' : 'No'}"`,
      `"${m.escalationLevel || 0}"`,
      `"${m.createdAt ? moment(m.createdAt).format('YYYY-MM-DD HH:mm:ss') : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SLA_Performance_Report_${moment().format('YYYYMMDD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenTimeline = (complaintId) => {
    setSelectedComplaintId(complaintId);
    setIsTimelineModalOpen(true);
  };

  return (
    <DashboardLayout userRole="admin">
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        
        {/* Header Title & Actions */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
            Centralized SLA Governance & Performance Monitoring
          </Title>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        {/* 1. Summary KPI Cards (4 Streamlined Cards) */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <Statistic title="Total Complaints" value={total} valueStyle={{ color: BRAND_COLORS.primary, fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: '8px' }}>
              <Statistic title="Active Cases" value={active} valueStyle={{ color: '#d97706', fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: '8px' }}>
              <Statistic title="SLA Breached" value={breached} valueStyle={{ color: '#dc2626', fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: '8px' }}>
              <Statistic
                title="Overall SLA Compliance"
                value={complianceRate}
                suffix="%"
                valueStyle={{ color: complianceRate >= 85 ? '#059669' : '#dc2626', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 2. Comprehensive Filter Bar */}
        <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '8px', marginBottom: '24px' }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={10}>
              <Input
                className="pill-search-input"
                placeholder="Search Ticket ID, Customer, Branch..."
                prefix={<SearchOutlined style={{ color: '#475569', fontSize: '16px' }} />}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={12} sm={6} md={5}>
              <Select placeholder="Priority" value={priorityFilter} onChange={setPriorityFilter} style={{ width: '100%' }} allowClear>
                <Option value="HIGHLY_SENSITIVE">Highly Sensitive</Option>
                <Option value="SENSITIVE">Sensitive</Option>
                <Option value="GENERAL">General</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={5}>
              <Select placeholder="SLA Status" value={slaStatusFilter} onChange={setSlaStatusFilter} style={{ width: '100%' }} allowClear>
                <Option value="ON_TRACK">On Track</Option>
                <Option value="APPROACHING">Approaching</Option>
                <Option value="BREACHED">Breached</Option>
                <Option value="ESCALATED">Escalated</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Button
                type="link"
                icon={<SyncOutlined />}
                onClick={() => {
                  setSearchQuery('');
                  setPriorityFilter('');
                  setCategoryFilter('');
                  setSlaStatusFilter('');
                  setDistrictFilter('');
                  setDateRange(null);
                }}
              >
                Reset Filters
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 3. Single High-Density SLA Performance Monitoring Table */}
        <Card bodyStyle={{ padding: '20px' }} style={{ borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClockCircleOutlined style={{ color: BRAND_COLORS.primary, fontSize: '18px' }} />
              <Title level={4} style={{ color: BRAND_COLORS.primary, margin: 0, fontSize: '16px' }}>
                Live SLA Performance & Breach Monitoring
              </Title>
            </div>
            <Space wrap>
              <Button icon={<DownloadOutlined />} onClick={exportCSV}>Export Excel</Button>
              <Button icon={<FileTextOutlined />} onClick={() => window.print()}>Export PDF / Print</Button>
            </Space>
          </div>

          <div style={{ background: '#fff', padding: '12px 20px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
            <Table
              dataSource={filteredMetrics}
              rowKey="id"
              loading={loading}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                showSizeChanger: true,
                pageSizeOptions: [10, 25, 50, 100],
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} complaints`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                }
              }}
              columns={[
                {
                  title: 'Complaint ID',
                  dataIndex: 'complaintId',
                  key: 'complaintId',
                  width: 220,
                  render: (id) => (
                    <span
                      onClick={() => handleOpenTimeline(id)}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: BRAND_COLORS.primary,
                        fontWeight: 600,
                        background: '#f3f4f6',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                        cursor: 'pointer'
                      }}
                    >
                      {id || '—'}
                    </span>
                  )
                },
                {
                  title: 'Customer',
                  dataIndex: 'customerName',
                  key: 'customerName',
                  width: 130,
                  render: (name) => <span style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>{name || '—'}</span>
                },
                {
                  title: 'Priority',
                  dataIndex: 'priority',
                  key: 'priority',
                  width: 110,
                  render: (p) => {
                    const color = p === 'HIGHLY_SENSITIVE' ? 'red' : p === 'SENSITIVE' ? 'orange' : 'green';
                    return <Tag color={color} style={{ fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>{p || 'GENERAL'}</Tag>;
                  }
                },
                {
                  title: 'Responsible Unit',
                  key: 'unit',
                  width: 220,
                  render: (_, r) => {
                    const unitStr = [r.branch, r.department].filter(Boolean).join(' - ') || 'HQ CMD';
                    return <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{unitStr}</span>;
                  }
                },
                {
                  title: 'SLA Status & Breach Info',
                  key: 'statusOrigin',
                  width: 220,
                  render: (_, r) => {
                    const isBreached = r.breached || r.slaStatus === 'BREACHED' || r.slaStatus === 'OVERDUE';
                    if (isBreached) {
                      const allowed = r.totalAllowedMinutes || 480;
                      const diff = Math.max(0, (r.totalElapsedMinutes || 0) - allowed);
                      return (
                        <Tag color="red" style={{ fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>
                          BREACHED (+{formatMins(diff)})
                        </Tag>
                      );
                    }
                    if (r.slaStatus === 'APPROACHING') {
                      return <Tag color="orange" style={{ fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>APPROACHING</Tag>;
                    }
                    if (r.slaStatus === 'RESOLVED_WITHIN_SLA') {
                      return <Tag color="green" style={{ fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>RESOLVED WITHIN SLA</Tag>;
                    }
                    return <Tag color="green" style={{ fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>ON TRACK</Tag>;
                  }
                },
                {
                  title: 'Action',
                  key: 'action',
                  width: 60,
                  align: 'center',
                  render: (_, r) => (
                    <Tooltip title="View Stage SLA Timeline">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined style={{ color: BRAND_COLORS.primary, fontSize: '15px' }} />}
                        onClick={() => handleOpenTimeline(r.complaintId)}
                        style={{ padding: '2px 4px', height: '24px', display: 'flex', alignItems: 'center' }}
                      />
                    </Tooltip>
                  )
                }
              ]}
            />
          </div>
        </Card>

        {/* SLA Timeline Modal */}
        <Modal
          title={<span style={{ fontSize: '18px', fontWeight: 700, color: BRAND_COLORS.primary }}>Complaint SLA Timeline — {selectedComplaintId || ''}</span>}
          open={isTimelineModalOpen}
          onOk={() => setIsTimelineModalOpen(false)}
          onCancel={() => setIsTimelineModalOpen(false)}
          width={1350}
          style={{ top: 20 }}
          styles={{ body: { padding: '24px', maxHeight: '80vh', overflowY: 'auto' } }}
          footer={[
            <Button key="close" type="primary" size="middle" onClick={() => setIsTimelineModalOpen(false)}>
              Close Timeline
            </Button>
          ]}
        >
          {selectedComplaintId && <SlaTimelineComponent complaintId={selectedComplaintId} />}
        </Modal>

      </div>
    </DashboardLayout>
  );
}

export default SlaMonitoringPage;
