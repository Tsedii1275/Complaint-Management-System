import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Tooltip, message, Space } from 'antd';
import { ClockCircleOutlined, UserOutlined, CheckOutlined, EyeOutlined } from '@ant-design/icons';
import { BRAND_COLORS } from '../constants/theme';
import ApiService from '../services/api';
import { getShortTitle, formatDate, PRIORITY_CONFIG } from './TaskCard';

/**
 * Neat, modern, high-density Table View for staff task queues.
 * Displays standard task card information in a clean, space-efficient single-row table format.
 */
const USER_NAME_MAP = {
  'eyoda': 'Eyoda Ephrem',
  'haset': 'Haset',
  'tseday': 'Tseday',
  'musie': 'Musie',
  'selam': 'Tadesse Alamu',
  'lidiya': 'Lidiya',
  'abel': 'Abel',
  'admin': 'Administrator'
};

const getDisplayName = (task) => {
  const nameOrUser = task.claimedByName || task.assigneeFullName || task.variables?.assigneeFullName || task.claimedBy || task.assignee || '';
  if (!nameOrUser) return '';
  const lower = nameOrUser.toString().trim().toLowerCase();
  return USER_NAME_MAP[lower] || nameOrUser;
};

function TaskTable({ tasks = [], onSelectTask, onTaskClaimed, showPriority = true }) {
  const [claimingMap, setClaimingMap] = useState({});
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [tasks.length]);

  const handleClaim = async (e, task) => {
    e.stopPropagation();
    try {
      setClaimingMap(prev => ({ ...prev, [task.id]: true }));
      await ApiService.claimTask(task.id);
      message.success(`Task ${task.complaintId || ''} claimed successfully.`);
      if (onTaskClaimed) onTaskClaimed(task.id);
    } catch (err) {
      console.error(err);
      message.error('Failed to claim task.');
    } finally {
      setClaimingMap(prev => ({ ...prev, [task.id]: false }));
    }
  };

  const columns = [
    {
      title: 'Ticket ID',
      dataIndex: 'complaintId',
      key: 'complaintId',
      width: 250,
      render: (id) => (
        <span style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#111827',
          fontWeight: 600,
          background: '#f3f4f6',
          padding: '3px 8px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          display: 'inline-block'
        }}>
          {id || '—'}
        </span>
      )
    },
    {
      title: 'Workflow Stage',
      dataIndex: 'name',
      key: 'name',
      render: (name, r) => {
        const isRejected = r.variables?.isSatisfied === false || !!(r.variables?.customerFeedbackComment);
        const shortTitle = isRejected ? 'Customer Rejected Resolution' : getShortTitle(name);
        const isCommitteeApproved = r.variables?.committeeDecision === 'approved';

        return (
          <Space size="small" wrap={false}>
            <span style={{ fontWeight: 600, color: BRAND_COLORS.primary, fontSize: '13px', whiteSpace: 'nowrap' }}>
              {shortTitle}
            </span>
            {isRejected && <Tag color="error" style={{ fontSize: '10px', margin: 0 }}>Customer Rejected</Tag>}
            {isCommitteeApproved && <Tag color="success" style={{ fontSize: '10px', margin: 0 }}>Committee Approved</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name) => (
        <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>
          <UserOutlined style={{ color: '#9ca3af', marginRight: '6px' }} />
          {name || '—'}
        </span>
      )
    },
    ...(showPriority ? [{
      title: 'Priority',
      key: 'priority',
      width: 130,
      render: (_, r) => {
        const rawPriority = (r.priority || r.variables?.complaintPriority || 'general').toString().toLowerCase().replace(/ /g, '_');
        const pConfig = PRIORITY_CONFIG[rawPriority] || PRIORITY_CONFIG.general;
        return (
          <span style={{ fontSize: '11px', background: pConfig.bg, color: pConfig.text, border: `1px solid ${pConfig.border}`, padding: '2px 6px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {pConfig.label}
          </span>
        );
      }
    }] : []),
    {
      title: 'Assigned Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => (
        <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>
          <ClockCircleOutlined style={{ marginRight: '4px', color: '#9ca3af' }} />
          {formatDate(date)}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'action',
      width: 210,
      align: 'right',
      render: (_, r) => {
        const isClaimed = r.isClaimed || (r.assignee && r.assignee !== 'initiator');
        const displayName = getDisplayName(r);
        const isLoading = !!claimingMap[r.id];

        return (
          <Space size={16} align="center" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Tooltip title="View Task Details">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined style={{ fontSize: '15px', color: BRAND_COLORS.primary }} />}
                onClick={() => onSelectTask(r)}
                style={{ padding: '2px 4px', height: '24px', display: 'flex', alignItems: 'center' }}
              />
            </Tooltip>

            {isClaimed ? (
              <Tag color="success" style={{ fontWeight: 600, fontSize: '10px', margin: 0, padding: '1px 6px', borderRadius: '5px' }}>
                <CheckOutlined /> Claimed ({displayName})
              </Tag>
            ) : (
              <Button
                type="primary"
                size="small"
                loading={isLoading}
                onClick={(e) => handleClaim(e, r)}
                style={{
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: BRAND_COLORS.primary,
                  borderColor: BRAND_COLORS.primary,
                  height: '24px',
                  padding: '0 8px'
                }}
              >
                Claim Task
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ background: '#fff', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        size="middle"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tasks`,
          onShowSizeChange: (current, size) => {
            setCurrentPage(1);
            setPageSize(size);
          },
          onChange: (page, size) => {
            setCurrentPage(page);
            if (size && size !== pageSize) {
              setPageSize(size);
            }
          }
        }}
        onRow={(record) => ({
          onClick: () => onSelectTask(record),
          style: { cursor: 'pointer' }
        })}
        bordered={false}
      />
    </div>
  );
}

export default TaskTable;
