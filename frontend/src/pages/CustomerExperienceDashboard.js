import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic, Progress, Table, Input, Empty, Alert, Spin, Tag, Space } from 'antd';
import { SearchOutlined, CheckCircleOutlined, InfoCircleOutlined, WarningOutlined, SmileOutlined, HeartOutlined, ToolOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';

const { Title, Text, Paragraph } = Typography;

function CustomerExperienceDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalSent: 0,
    totalResponses: 0,
    responseRate: 0,
    avgCsat: 0,
    avgNps: 0,
    avgCes: 0,
    confirmationRate: 0,
    disputeRate: 0,
    reopenedCount: 0
  });

  const [distributions, setDistributions] = useState({
    csat: [],
    nps: [],
    ces: []
  });

  const [feedbackList, setFeedbackList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (query = '') => {
    try {
      setLoading(true);
      setError('');
      
      const statsData = await ApiService.getCustomerFeedbackAnalytics();
      const distData = await ApiService.getCustomerFeedbackDistributions();
      const listData = await ApiService.getCustomerFeedbackList(query);
      
      setStats(statsData || {
        totalSent: 0,
        totalResponses: 0,
        responseRate: 0,
        avgCsat: 0,
        avgNps: 0,
        avgCes: 0,
        confirmationRate: 0,
        disputeRate: 0,
        reopenedCount: 0
      });
      setDistributions(distData || { csat: [], nps: [], ces: [] });
      setFeedbackList(listData || []);
    } catch (err) {
      setError(err.message || 'Failed to load customer experience metrics.');
      console.error('Error loading CX dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (val) => {
    setSearchQuery(val);
    loadData(val);
  };

  const columns = [
    {
      title: 'Ticket Number',
      dataIndex: 'ticketNumber',
      key: 'ticketNumber',
      render: (text, record) => {
        const ticket = text || record.ticketId || '-';
        return <Text strong code style={{ fontSize: '13px' }}>{ticket}</Text>;
      }
    },
    {
      title: 'Resolution Status',
      dataIndex: 'resolutionConfirmed',
      key: 'resolutionConfirmed',
      render: (confirmed, record) => {
        if (!record.feedbackSubmittedAt) {
          return <Tag color="blue">Pending Response</Tag>;
        }
        return (
          <Tag color={confirmed === true ? 'green' : 'red'}>
            {confirmed === true ? 'Satisfied (Closed)' : 'Disputed (Reopened)'}
          </Tag>
        );
      }
    },
    {
      title: 'CSAT (1-5)',
      dataIndex: 'csatScore',
      key: 'csatScore',
      render: (score) => score ? <Text strong style={{ color: score >= 4 ? '#52c41a' : score <= 2 ? '#f5222d' : '#faad14' }}>{score} / 5</Text> : <Text type="secondary">-</Text>
    },
    {
      title: 'NPS (0-10)',
      dataIndex: 'npsScore',
      key: 'npsScore',
      render: (score) => score !== null ? (
        <Tag color={score >= 9 ? 'green' : score <= 6 ? 'red' : 'orange'}>
          {score}
        </Tag>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: 'CES (1-7)',
      dataIndex: 'cesScore',
      key: 'cesScore',
      render: (score) => score ? <Text strong>{score} / 7</Text> : <Text type="secondary">-</Text>
    },
    {
      title: 'Comments',
      dataIndex: 'additionalComments',
      key: 'additionalComments',
      width: '250px',
      render: (text, record) => {
        const parts = [];
        if (record.npsComment) parts.push(`NPS: ${record.npsComment}`);
        if (record.cesComment) parts.push(`CES: ${record.cesComment}`);
        if (text) parts.push(`General: ${text}`);
        return parts.length > 0 ? (
          <div style={{ maxWidth: '240px', fontSize: '12px' }}>
            {parts.map((p, idx) => <Paragraph key={idx} ellipsis={{ rows: 2, expandable: true }} style={{ marginBottom: 4 }}>{p}</Paragraph>)}
          </div>
        ) : <Text type="secondary" italic>None</Text>;
      }
    },
    {
      title: 'Submission Date',
      dataIndex: 'feedbackSubmittedAt',
      key: 'feedbackSubmittedAt',
      render: (date) => date ? new Date(date).toLocaleString() : '-'
    }
  ];

  const renderDistributionProgress = (title, items, maxVal, color) => {
    const total = items.reduce((sum, item) => sum + (item.count || 0), 0);
    return (
      <Card title={title} bordered={false} style={{ boxShadow: 'none', background: 'transparent' }} size="small">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {items.map((item) => {
            const percentage = total > 0 ? Math.round(((item.count || 0) * 100) / total) : 0;
            return (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ minWidth: '40px', fontWeight: 600, fontSize: '12px' }}>Score {item.label}</span>
                <Progress 
                  percent={percentage} 
                  strokeColor={color} 
                  status="normal" 
                  format={() => `${item.count} (${percentage}%)`}
                  style={{ flexGrow: 1, margin: 0 }}
                />
              </div>
            );
          })}
        </Space>
      </Card>
    );
  };

  return (
    <DashboardLayout userRole="admin">
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>
              Customer Experience (CX) Dashboard
            </Title>
            <Text type="secondary" style={{ fontSize: '15px' }}>
              Real-time satisfaction measurement, CSAT, NPS, and CES analytics
            </Text>
          </div>
        </div>

        {error && (
          <Alert message="Error Loading CX Data" description={error} type="error" showIcon closable style={{ marginBottom: '24px' }} />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spin size="large" tip="Loading CX analytics statistics..." />
          </div>
        ) : (
          <div>
            {/* KPI Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap' }}>
              <Col xs={24} sm={12} md={4} style={{ flex: '1 1 18%', minWidth: '180px' }}>
                <Card bordered style={{ borderRadius: '8px', background: '#fafafa', border: '1px solid #e8e8e8', height: '100%' }}>
                  <Statistic 
                    title="Survey Requests Sent" 
                    value={stats.totalSent} 
                    valueStyle={{ color: BRAND_COLORS.primary, fontWeight: 600, fontSize: '22px' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={4} style={{ flex: '1 1 18%', minWidth: '180px' }}>
                <Card bordered style={{ borderRadius: '8px', background: '#fafafa', border: '1px solid #e8e8e8', height: '100%' }}>
                  <Statistic 
                    title="Total Responses" 
                    value={stats.totalResponses} 
                    valueStyle={{ color: '#52c41a', fontWeight: 600, fontSize: '22px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                    Response Rate: <strong>{stats.responseRate.toFixed(1)}%</strong>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={4} style={{ flex: '1 1 18%', minWidth: '180px' }}>
                <Card bordered style={{ borderRadius: '8px', background: '#fafafa', border: '1px solid #e8e8e8', height: '100%' }}>
                  <Statistic 
                    title="Avg CSAT Score" 
                    value={stats.avgCsat} 
                    precision={2}
                    valueStyle={{ color: '#262626', fontWeight: 600, fontSize: '22px' }}
                    suffix=" / 5"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={4} style={{ flex: '1 1 18%', minWidth: '180px' }}>
                <Card bordered style={{ borderRadius: '8px', background: '#fafafa', border: '1px solid #e8e8e8', height: '100%' }}>
                  <Statistic 
                    title="Avg Net Promoter (NPS)" 
                    value={stats.avgNps} 
                    precision={2}
                    valueStyle={{ color: '#262626', fontWeight: 600, fontSize: '22px' }}
                    suffix=" / 10"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={24} md={4} style={{ flex: '1 1 18%', minWidth: '180px' }}>
                <Card bordered style={{ borderRadius: '8px', background: '#fafafa', border: '1px solid #e8e8e8', height: '100%' }}>
                  <Statistic 
                    title="Avg Effort Score (CES)" 
                    value={stats.avgCes} 
                    precision={2}
                    valueStyle={{ color: '#262626', fontWeight: 600, fontSize: '22px' }}
                    suffix=" / 7"
                  />
                </Card>
              </Col>
            </Row>

            {/* Confirmation vs Disputes Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24} md={8}>
                <Card title="Resolution Confirmation Rate" bordered={false} style={{ borderRadius: '12px', height: '100%' }}>
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <Progress type="circle" percent={Math.round(stats.confirmationRate)} strokeColor="#52c41a" width={120} />
                    <div style={{ marginTop: '16px' }}>
                      <Text type="secondary">Confirmation rate of resolved cases closed successfully.</Text>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card title="Dispute & Reopen Rate" bordered={false} style={{ borderRadius: '12px', height: '100%' }}>
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <Progress type="circle" percent={Math.round(stats.disputeRate)} strokeColor="#ff4d4f" width={120} />
                    <div style={{ marginTop: '16px' }}>
                      <Text type="secondary">Disputed rate leading to automatic case reopening.</Text>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card title="Dispute Escalations" bordered={false} style={{ borderRadius: '12px', height: '100%' }}>
                  <div style={{ padding: '12px 0' }}>
                    <Row gutter={[12, 12]}>
                      <Col span={24}>
                        <Statistic 
                          title="Total Reopened Complaints" 
                          value={stats.reopenedCount} 
                          valueStyle={{ color: '#ff4d4f', fontWeight: 700 }}
                          prefix={<WarningOutlined />} 
                        />
                      </Col>
                    </Row>
                    <div style={{ marginTop: '16px', fontSize: '12px', background: '#fcf8e3', padding: '8px 12px', borderRadius: '6px', border: '1px solid #faebcc' }}>
                      <Text warning style={{ color: '#c09853' }}>
                        Disputed resolutions trigger Branch/Department Manager investigations and secondary reviews automatically.
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Score Distributions */}
            <Card title="Customer Satisfaction Metrics Distributions" bordered={false} style={{ borderRadius: '12px', marginBottom: '24px' }}>
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  {renderDistributionProgress("CSAT Distribution", distributions.csat, 5, BRAND_COLORS.primary)}
                </Col>
                <Col xs={24} md={8}>
                  {renderDistributionProgress("NPS Distribution", distributions.nps, 10, "#eb2f96")}
                </Col>
                <Col xs={24} md={8}>
                  {renderDistributionProgress("CES Distribution", distributions.ces, 7, "#722ed1")}
                </Col>
              </Row>
            </Card>

            {/* Feedback List Table */}
            <Card 
              title="Customer Feedback Logs" 
              bordered={false} 
              style={{ borderRadius: '12px' }}
              extra={
                <Input
                  placeholder="Search by Complaint ID or Ticket..."
                  prefix={<SearchOutlined />}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ width: 280 }}
                  allowClear
                />
              }
            >
              <Table 
                columns={columns} 
                dataSource={feedbackList}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 25, 50, 100],
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} feedback records`
                }}
                locale={{ emptyText: <Empty description="No feedback records found" /> }}
              />
            </Card>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default CustomerExperienceDashboard;
