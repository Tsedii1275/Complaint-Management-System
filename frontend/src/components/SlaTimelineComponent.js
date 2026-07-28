import React, { useState, useEffect } from 'react';
import { Table, Tag, Alert, Typography, Spin } from 'antd';
import { ClockCircleOutlined, CheckOutlined, WarningFilled, UserOutlined } from '@ant-design/icons';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import { getShortTitle } from './TaskCard';
import moment from 'moment';

const { Title, Text } = Typography;

function SlaTimelineComponent({ complaintId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(moment());

  // Real-time ticking interval for live seconds count
  useEffect(() => {
    const timer = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (complaintId) {
      loadTimeline();
    }
  }, [complaintId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getComplaintSlaTimeline(complaintId);
      setTimeline(data || []);
    } catch (err) {
      console.error('Failed to load SLA timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format real-time durations with seconds precision
  const formatMins = (mins) => {
    if (mins === null || mins === undefined) return '—';
    const num = Number(mins);
    if (isNaN(num)) return '—';
    if (num <= 0) return '0 Secs';

    // Under 1 minute: display exact seconds!
    if (num < 1) {
      const secs = Math.round(num * 60);
      return secs > 0 ? `${secs} Secs` : '< 1 Sec';
    }

    if (num < 60) return `${Math.round(num)} Mins`;
    if (num < 480) return `${(num / 60).toFixed(1)} Hours`;
    return `${(num / 480).toFixed(1)} Days`;
  };

  // Calculate live real-time response elapsed minutes
  const getLiveResponseTimeMins = (r) => {
    if (r.responseTimeMinutes && r.responseTimeMinutes > 0) return r.responseTimeMinutes;
    if (!r.startedAt) return 0;
    const end = r.claimedAt ? moment(r.claimedAt) : now;
    return Math.max(0, end.diff(moment(r.startedAt), 'seconds') / 60);
  };

  // Calculate live real-time resolution elapsed minutes
  const getLiveResolutionTimeMins = (r) => {
    if (r.resolutionTimeMinutes && r.resolutionTimeMinutes > 0) return r.resolutionTimeMinutes;
    if (r.durationMinutes && r.durationMinutes > 0) return r.durationMinutes;
    if (!r.startedAt) return 0;
    const end = r.completedAt ? moment(r.completedAt) : now;
    return Math.max(0, end.diff(moment(r.startedAt), 'seconds') / 60);
  };

  // Helper to evaluate breach and time taken per stage
  const getStageBreachInfo = (t) => {
    if (!t) return { isBreached: false };
    const targetMins = t.resolutionSlaTargetMinutes || 240;
    const actualMins = getLiveResolutionTimeMins(t);

    const respTargetMins = t.responseSlaTargetMinutes || 30;
    const respActualMins = getLiveResponseTimeMins(t);

    const isResolutionBreached = t.resolutionSlaStatus === 'BREACHED' || (actualMins > targetMins && actualMins > 0);
    const isResponseBreached = t.responseSlaStatus === 'BREACHED' || (t.isClaimed && respActualMins > respTargetMins && respActualMins > 0);

    if (isResolutionBreached) {
      const overBy = Math.max(0, actualMins - targetMins);
      return {
        type: 'Time To Resolution Exceeded',
        overBy,
        targetMins,
        actualMins,
        isBreached: true
      };
    }

    if (isResponseBreached) {
      const overBy = Math.max(0, respActualMins - respTargetMins);
      return {
        type: 'Time To Respond Exceeded',
        overBy,
        targetMins: respTargetMins,
        actualMins: respActualMins,
        isBreached: true
      };
    }

    return { isBreached: false, actualMins, targetMins };
  };

  const breachStage = timeline.find(t => getStageBreachInfo(t)?.isBreached);
  const breachInfo = breachStage ? getStageBreachInfo(breachStage) : null;

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <ClockCircleOutlined style={{ color: BRAND_COLORS.primary, fontSize: '18px' }} />
        <Title level={4} style={{ color: BRAND_COLORS.primary, margin: 0, fontSize: '15px' }}>
          Stage SLA Timeline
        </Title>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin size="medium" tip="Loading SLA Timeline..." />
        </div>
      ) : (
        <div>
          {/* SLA Breach Location Highlight Banner */}
          {breachStage && breachInfo && (
            <Alert
              message={
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b', lineHeight: 1.6 }}>
                  <WarningFilled style={{ marginRight: '8px', color: '#dc2626', fontSize: '16px' }} />
                  <strong>SLA Breach Location Identified:</strong> {getShortTitle(breachStage.taskName || breachStage.taskDefinitionKey)} Stage — Responsible Department/Unit: <strong style={{ color: '#dc2626', textDecoration: 'underline' }}>{breachStage.laneName || 'Work Unit'} ({breachStage.assignedUser || breachStage.claimedBy || 'Unassigned'})</strong> (Time Taken: {formatMins(breachInfo.actualMins)} vs Target: {formatMins(breachInfo.targetMins)} — Exceeded by <Text type="danger" strong>+{formatMins(breachInfo.overBy)}</Text>)
                </div>
              }
              type="error"
              showIcon={false}
              style={{ marginBottom: '16px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', padding: '12px 16px' }}
            />
          )}

          <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <Table
              dataSource={timeline}
              rowKey="id"
              pagination={false}
              size="middle"
              bordered={false}
              columns={[
                {
                  title: <span style={{ fontWeight: 700, color: '#111827', fontSize: '13px' }}>Workflow Stage</span>,
                  dataIndex: 'taskName',
                  key: 'taskName',
                  width: 260,
                  render: (name, r) => (
                    <div style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: BRAND_COLORS.primary, fontSize: '13px', marginRight: '8px' }}>
                        {getShortTitle(name || r.taskDefinitionKey)}
                      </span>
                      <Tag color="blue" style={{ fontSize: '11px', fontWeight: 600, margin: 0 }}>{r.laneName || 'Queue'}</Tag>
                    </div>
                  )
                },
                {
                  title: <span style={{ fontWeight: 700, color: '#111827', fontSize: '13px' }}>Responsible Officer</span>,
                  dataIndex: 'assignedUser',
                  key: 'assignedUser',
                  width: 200,
                  render: (user, r) => {
                    const owner = user || r.claimedBy || 'Unclaimed';
                    const isClaimed = r.isClaimed || (owner !== 'Unclaimed' && owner !== 'initiator');
                    return (
                      <div style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <UserOutlined style={{ color: BRAND_COLORS.primary, marginRight: '6px' }} />
                        <span style={{ fontWeight: 700, color: '#1f2937', marginRight: '8px' }}>{owner}</span>
                        {isClaimed ? (
                          <Tag color="success" style={{ fontSize: '11px', padding: '1px 8px', fontWeight: 600, margin: 0 }}>
                            <CheckOutlined /> Claimed
                          </Tag>
                        ) : (
                          <Tag color="warning" style={{ fontSize: '11px', padding: '1px 8px', fontWeight: 600, margin: 0 }}>Unclaimed</Tag>
                        )}
                      </div>
                    );
                  }
                },
                {
                  title: <span style={{ fontWeight: 700, color: '#111827', fontSize: '13px' }}>Date Timeline</span>,
                  key: 'timestamps',
                  width: 260,
                  render: (_, r) => (
                    <div style={{ fontSize: '12px', color: '#374151', fontFamily: 'monospace', whiteSpace: 'nowrap', lineHeight: 1.6 }}>
                      <div><strong style={{ color: '#6b7280' }}>Assigned:</strong> {r.startedAt ? moment(r.startedAt).format('MMM DD, YYYY HH:mm:ss') : '—'}</div>
                      <div><strong style={{ color: '#6b7280' }}>Completed:</strong> {r.completedAt ? moment(r.completedAt).format('MMM DD, YYYY HH:mm:ss') : <Tag color="processing" style={{ fontSize: '11px', margin: 0 }}>In Progress</Tag>}</div>
                    </div>
                  )
                },
                {
                  title: <span style={{ fontWeight: 700, color: '#111827', fontSize: '13px' }}>Time To Respond</span>,
                  key: 'responseSla',
                  width: 250,
                  render: (_, r) => {
                    const respActualMins = getLiveResponseTimeMins(r);
                    const respTargetMins = r.responseSlaTargetMinutes || 30;
                    const isBreached = r.responseSlaStatus === 'BREACHED' || (r.isClaimed && respActualMins > respTargetMins && respActualMins > 0);

                    return (
                      <div style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <div style={{ marginBottom: '4px' }}>
                          <Tag color={isBreached ? 'red' : r.isClaimed ? 'green' : 'orange'} style={{ fontWeight: 700, fontSize: '11px', padding: '1px 8px' }}>
                            {isBreached ? 'RESPOND BREACHED' : r.isClaimed ? 'Responded' : 'Pending Claim'}
                          </Tag>
                        </div>
                        <div>
                          <span style={{ color: isBreached ? '#dc2626' : '#059669', fontWeight: 700, fontSize: '13px' }}>
                            Took: {formatMins(respActualMins)}
                          </span>
                          <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: '6px' }}>
                            (Target: {formatMins(respTargetMins)})
                          </span>
                        </div>
                      </div>
                    );
                  }
                },
                {
                  title: <span style={{ fontWeight: 700, color: '#111827', fontSize: '13px' }}>Time To Resolution</span>,
                  key: 'resolutionSla',
                  width: 260,
                  render: (_, r) => {
                    const stageInfo = getStageBreachInfo(r);
                    const actualMins = getLiveResolutionTimeMins(r);
                    const targetMins = r.resolutionSlaTargetMinutes || 240;
                    const isBreached = stageInfo?.isBreached;

                    return (
                      <div style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <div style={{ marginBottom: '4px' }}>
                          <Tag color={isBreached ? 'red' : r.completedAt ? 'green' : 'blue'} style={{ fontWeight: 700, fontSize: '11px', padding: '1px 8px' }}>
                            {isBreached ? `BREACHED (+${formatMins(stageInfo.overBy)})` : r.completedAt ? 'Resolved Within SLA' : 'In Progress'}
                          </Tag>
                        </div>
                        <div>
                          <span style={{ color: isBreached ? '#dc2626' : r.completedAt ? '#059669' : '#3b82f6', fontWeight: 700, fontSize: '13px' }}>
                            Took: {formatMins(actualMins)}
                          </span>
                          <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: '6px' }}>
                            (Target: {formatMins(targetMins)})
                          </span>
                        </div>
                      </div>
                    );
                  }
                }
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SlaTimelineComponent;
