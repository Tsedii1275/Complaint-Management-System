import React, { useState } from 'react';
import { Tooltip, Tag, Button, message } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  TagOutlined,
  CheckOutlined,
  FileTextOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { BRAND_COLORS } from '../constants/theme';
import ApiService from '../services/api';

const PRIORITY_CONFIG = {
  highly_sensitive: { label: 'HS (Highly Sensitive)', bg: '#fff1f0', border: '#ffa39e', dot: '#ff4d4f', text: '#cf1322' },
  sensitive:        { label: 'Sensitive',            bg: '#fff7e6', border: '#ffd591', dot: '#fa8c16', text: '#ad6800' },
  general:          { label: 'General',              bg: '#f6ffed', border: '#b7eb8f', dot: '#52c41a', text: '#389e0d' },
  p1: { label: 'P1', bg: '#fff1f0', border: '#ffa39e', dot: '#ff4d4f', text: '#cf1322' },
  p2: { label: 'P2', bg: '#fff7e6', border: '#ffd591', dot: '#fa8c16', text: '#ad6800' },
  p3: { label: 'P3', bg: '#f6ffed', border: '#b7eb8f', dot: '#52c41a', text: '#389e0d' },
};

const TASK_TITLE_MAP = {
  // CMD
  'Screen and categorize complaints for proper routing': 'Screening',
  'screens the complaint categorize and set its priority level': 'Categorize & Route',
  // Audit
  'Investigate the complaint': 'Investigate',
  'conduct an investigation': 'Investigate',
  // WorkUnit
  'Investigate and resolve the complaint': 'Resolve',
  'resolve the complaint': 'Resolve',
  // Chief Committee
  'Review investigation findings and make a decision': 'Review & Decide',
  'Chief Committee Review': 'Review & Decide',
  // Service Quality
  'Notify Customer of Resolution': 'Notify Customer',
  'Send resolution notification': 'Notify Customer',
};

function getShortTitle(name) {
  if (!name) return 'Task';
  const key = Object.keys(TASK_TITLE_MAP).find(k =>
    name.toLowerCase().includes(k.toLowerCase())
  );
  if (key) return TASK_TITLE_MAP[key];
  return name.length > 22 ? name.substring(0, 22) + '…' : name;
}

function formatTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

/**
 * Clean, minimalist task card for operational staff dashboards featuring seamless Claim Task action.
 */
function TaskCard({ task, onClick, onTaskClaimed, badge, badgeColor = '#52c41a' }) {
  const [claiming, setClaiming] = useState(false);

  const isClaimed = task.isClaimed || (task.assignee && task.assignee !== 'initiator');
  const claimedBy = task.claimedBy || task.assignee;

  const rawPriority = (task.priority || task.variables?.complaintPriority || 'general').toString().toLowerCase().replace(/ /g, '_');
  const pConfig = PRIORITY_CONFIG[rawPriority] || PRIORITY_CONFIG.general;

  const isRejected = task.variables?.isSatisfied === false || !!(task.variables?.customerFeedbackComment);
  const shortTitle = isRejected ? 'Customer Rejected Resolution' : getShortTitle(task.name);

  const handleClaimClick = async (e) => {
    e.stopPropagation();
    try {
      setClaiming(true);
      await ApiService.claimTask(task.id);
      message.success(`Task ${task.complaintId || ''} claimed successfully.`);
      if (onTaskClaimed) onTaskClaimed(task.id);
    } catch (err) {
      console.error(err);
      message.error('Failed to claim task.');
    } finally {
      setClaiming(false);
    }
  };

  const cardStyle = {
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease, transform 0.15s ease, border-color 0.2s ease',
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(1,33,105,0.12)';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = BRAND_COLORS.primary;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      <div style={{ padding: '14px 16px 12px' }}>
        
        {/* Header row: Title */}
        <div style={{ marginBottom: '8px' }}>
          <Tooltip title={task.name}>
            <div style={{
              fontWeight: 700,
              fontSize: '14px',
              color: BRAND_COLORS.primary,
              lineHeight: 1.3,
            }}>
              {shortTitle}
            </div>
          </Tooltip>
        </div>

        {/* Ticket ID & Priority Tag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#374151', fontWeight: 600, background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
            {task.complaintId || '—'}
          </div>
          <span style={{ fontSize: '10px', background: pConfig.bg, color: pConfig.text, border: `1px solid ${pConfig.border}`, padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
            {pConfig.label}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#f3f4f6', margin: '8px 0' }} />

        {/* Customer row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <UserOutlined style={{ color: '#9ca3af', fontSize: '11px', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.customerName || '—'}
          </span>
        </div>

        {/* Branch / Department Info */}
        {(task.variables?.branch || task.variables?.department) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <TagOutlined style={{ color: '#9ca3af', fontSize: '11px', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[task.variables.branch, task.variables.department].filter(Boolean).join(' - ')}
            </span>
          </div>
        )}

        {/* Assignment & Claim Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ClockCircleOutlined style={{ color: '#9ca3af', fontSize: '11px' }} />
            <span style={{ fontSize: '11px', color: '#6b7280' }}>
              {formatDate(task.createdAt)}
            </span>
          </div>

          {isClaimed ? (
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600, background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
              <CheckOutlined /> Claimed ({claimedBy})
            </span>
          ) : (
            <Button
              type="primary"
              size="small"
              loading={claiming}
              onClick={handleClaimClick}
              style={{
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: BRAND_COLORS.primary,
                borderColor: BRAND_COLORS.primary,
                height: '26px',
                padding: '0 10px'
              }}
            >
              Claim Task
            </Button>
          )}
        </div>

        {/* Footer link */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ fontSize: '15px', color: BRAND_COLORS.primary }} />}
              onClick={onClick}
              style={{ padding: '2px 4px', height: '24px', display: 'flex', alignItems: 'center' }}
            />
          </Tooltip>

          {badge && (
            <div style={{
              background: badgeColor,
              color: '#fff',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
            }}>
              {badge}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default TaskCard;
export { getShortTitle, formatDate, formatTime, PRIORITY_CONFIG };
