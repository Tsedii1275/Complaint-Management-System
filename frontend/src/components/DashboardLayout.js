// Force HMR recompile to bind PieChartOutlined
import React, { useState, useEffect } from 'react';
import { Layout, Typography, Avatar, Dropdown, Button, Menu, Grid, Drawer, Popover, Badge, List, Modal, Descriptions, Tag } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  WarningFilled,
  CloseOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  PieChartOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { BRAND_COLORS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import '../index.css';

const { Header: AntHeader, Sider, Content } = Layout;
const { Title, Text } = Typography;

function SidebarMenu({ collapsed, userRole, user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [];

  if (userRole === 'service-quality' || userRole === 'service_quality') {
    menuItems.push({
      key: '/service-quality',
      icon: <BellOutlined />,
      label: 'Customer Notifications',
    });
    menuItems.push({
      key: '/service-quality/monitoring',
      icon: <DashboardOutlined />,
      label: 'SLA Monitoring',
    });
  } else if (userRole === 'management-dashboard' || userRole?.startsWith('ROLE_BRANCH_MANAGER') || userRole?.startsWith('ROLE_DEPARTMENT_MANAGER') || userRole?.startsWith('ROLE_REGIONAL_DIRECTOR') || userRole?.startsWith('ROLE_DEPARTMENT_DIRECTOR')) {
    menuItems.push({
      key: '/management-dashboard',
      icon: <HomeOutlined />,
      label: 'Management Dashboard',
    });
  } else if (userRole === 'executive-dashboard' || userRole?.startsWith('ROLE_CHIEF_') || userRole?.startsWith('ROLE_EXECUTIVE_') || userRole?.startsWith('ROLE_CEO_')) {
    menuItems.push({
      key: '/executive-dashboard',
      icon: <HomeOutlined />,
      label: 'Executive Dashboard',
    });
  } else if (userRole !== 'admin') {
    menuItems.push({
      key: `/${userRole}`,
      icon: <HomeOutlined />,
      label: 'Dashboard',
    });
  }

  if (userRole === 'admin') {
    menuItems.push({
      key: '/admin',
      icon: <DashboardOutlined />,
      label: 'Analytics Dashboard',
    });
    menuItems.push({
      key: '/admin/nbe-reports',
      icon: <FileTextOutlined />,
      label: 'NBE Reports',
    });
    menuItems.push({
      key: '/admin/rca',
      icon: <SettingOutlined />,
      label: 'Root Cause Analysis',
    });
    menuItems.push({
      key: '/admin/customer-experience',
      icon: <PieChartOutlined />,
      label: 'Customer Experience',
    });
    menuItems.push({
      key: '/admin/sla-monitoring',
      icon: <ClockCircleOutlined />,
      label: 'SLA Performance & Monitoring',
    });
    menuItems.push({
      key: '/admin/sla-config',
      icon: <SettingOutlined />,
      label: 'SLA Governance & Policy Configuration',
    });
  }

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      style={{ borderRight: 'none', padding: '0 8px' }}
      onClick={({ key }) => navigate(key)}
    />
  );
}

function AppHeader({ collapsed, setCollapsed, userRole, user, onLogout, onProfileClick }) {
  const [tasks, setTasks] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const fetchTasks = async () => {
    try {
      if (!user || userRole === 'admin') return;
      const data = await ApiService.getEnrichedTasks();
      setTasks(data || []);
    } catch (err) {
      console.error('Failed to fetch tasks in AppHeader:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const slaWarningTasks = tasks.filter(t => t.slaStatus === 'OVERDUE' || t.slaStatus === 'APPROACHING');

  const titleContent = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '280px' }}>
      <span style={{ fontWeight: 'bold', color: BRAND_COLORS.primary }}>
        {userRole === 'admin' ? 'Notifications' : 'SLA Warnings'}
      </span>
      <Button 
        type="text" 
        icon={<CloseOutlined style={{ fontSize: '12px' }} />} 
        size="small" 
        onClick={() => setPopoverOpen(false)}
        style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
      />
    </div>
  );

  const popoverContent = (
    <div style={{ maxWidth: '300px', maxHeight: '350px', overflowY: 'auto' }}>
      {userRole === 'admin' ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#8c8c8c' }}>
          No unread system notifications.
        </div>
      ) : slaWarningTasks.length === 0 ? (
        <div style={{ padding: '12px', textAlign: 'center', color: '#8c8c8c' }}>
          No active SLA warnings.
        </div>
      ) : (
        <List
          size="small"
          dataSource={slaWarningTasks}
          renderItem={(task) => {
            const isOverdue = task.slaStatus === 'OVERDUE';
            return (
              <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                  <WarningFilled style={{ color: isOverdue ? '#ff4d4f' : '#faad14', marginTop: '4px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>
                      Ticket #{task.complaintId || 'Unknown'} ({task.priority || 'P2'})
                    </div>
                    <div style={{ fontSize: '12px', color: '#5a6578' }}>
                      Task: {task.name}
                    </div>
                    <div style={{ fontSize: '12px', color: isOverdue ? '#ff4d4f' : '#faad14', fontWeight: 'bold' }}>
                      SLA: {task.slaStatus === 'OVERDUE' ? 'BREACHED (Overdue)' : 'APPROACHING (Near Deadline)'}
                    </div>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: 'My Profile',
        icon: <UserOutlined />,
        onClick: onProfileClick
      },
      {
        key: 'logout',
        label: 'Logout',
        icon: <LogoutOutlined />,
        danger: true,
        onClick: onLogout,
      },
    ],
  };

  const getRoleTitle = (role) => {
    if (user?.fullName) {
      return user.fullName;
    }
    const titles = {
      'branch-staff': 'Branch Staff',
      'cmd': 'CMD Officer',
      'audit': 'Audit Team',
      'work-unit': 'Work Unit',
      'service-quality': 'Service Quality',
      'chief-committee': 'Committee',
      'admin': 'System Admin',

      'management-dashboard': 'Management Dashboard',
      'ROLE_BRANCH_MANAGER': 'Branch Manager',
      'ROLE_DEPARTMENT_MANAGER': 'Department Manager',
      'ROLE_REGIONAL_DIRECTOR': 'Regional Director',
      'ROLE_DEPARTMENT_DIRECTOR': 'Department Director',

      'executive-dashboard': 'Executive Dashboard',
      'ROLE_CHIEF_BANKING_OFFICER': 'Chief Banking Officer',
      'ROLE_CHIEF_OPERATIONS_OFFICER': 'Chief Operations Officer',
      'ROLE_EXECUTIVE_COMMITTEE': 'Executive Committee Member',
      'ROLE_CEO_OFFICE': 'CEO Office'
    };
    return titles[role] || 'Dashboard';
  };

  const displayName = user?.fullName || user?.username || `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} User`;
  const initial = (user?.fullName || user?.username || userRole).charAt(0).toUpperCase();

  return (
    <AntHeader style={{
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      height: '64px',
      backgroundColor: BRAND_COLORS.primary
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            fontSize: '18px',
            color: 'white',
            display: 'none',
            padding: 0,
            width: 32,
            height: 32
          }}
          className="sidebar-toggle"
        />
        <img
          src="/download.png"
          alt="Dashen Bank Logo"
          style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
        />
        <Title level={4} style={{ color: BRAND_COLORS.white, margin: 0, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
          Complaint Management
        </Title>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Popover
          content={popoverContent}
          title={titleContent}
          trigger="click"
          open={popoverOpen}
          onOpenChange={(visible) => setPopoverOpen(visible)}
          placement="bottomRight"
          overlayStyle={{ zIndex: 1050 }}
        >
          <Badge 
            count={slaWarningTasks.length} 
            offset={[8, -2]}
          >
            <BellOutlined style={{ fontSize: '18px', cursor: 'pointer', color: BRAND_COLORS.white }} />
          </Badge>
        </Popover>
        <Dropdown menu={userMenu} trigger={['click']}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <Avatar style={{ backgroundColor: BRAND_COLORS.accent, color: BRAND_COLORS.primary, fontWeight: 'bold' }}>
              {initial}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }} className="hide-on-mobile">
              <Text style={{ color: BRAND_COLORS.white, fontWeight: 500 }}>
                {displayName}
              </Text>
            </div>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
}

const DashboardLayout = ({ children, userRole }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  const handleLogout = () => {
    console.log('DashboardLayout - Logging out user');
    logout();
    console.log('DashboardLayout - User logged out via AuthContext, redirecting to /staff-login');
    navigate('/staff-login');
  };

  return (
    <Layout style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <AppHeader
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        userRole={userRole}
        user={user}
        onLogout={handleLogout}
        onProfileClick={() => setIsProfileModalOpen(true)}
      />
      <Layout style={{ overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            width={260}
            theme="light"
            style={{
              borderRight: `1px solid ${BRAND_COLORS.sidebarBorder}`,
              boxShadow: '2px 0 8px rgba(0,0,0,0.02)',
              zIndex: 5,
              height: 'calc(100vh - 64px)',
              position: 'relative'
            }}
          >
            <div style={{ padding: '16px', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: '16px' }}
              />
            </div>
            <SidebarMenu collapsed={collapsed} userRole={userRole} user={user} />
          </Sider>
        )}

        {/* Mobile Sidebar */}
        <Drawer
          title="Complaint Management"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={isMobile && mobileDrawerOpen}
          width={280}
          styles={{ body: { padding: 0 } }}
        >
          <SidebarMenu collapsed={false} userRole={userRole} user={user} />
        </Drawer>

        <Layout style={{ display: 'flex', flexDirection: 'column' }}>
          <Content
            className="main-content-area"
            style={{
              background: BRAND_COLORS.background,
              overflowY: 'auto',
              flex: '1 1 auto',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>

      <Modal
        title={<span style={{ color: BRAND_COLORS.primary, fontWeight: 'bold', fontSize: '18px' }}><UserOutlined style={{ marginRight: '8px' }} /> User Profile Details</span>}
        open={isProfileModalOpen}
        onOk={() => setIsProfileModalOpen(false)}
        onCancel={() => setIsProfileModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsProfileModalOpen(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ padding: '12px 0' }}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Username"><Text strong>{user?.username || 'N/A'}</Text></Descriptions.Item>
            <Descriptions.Item label="Email Contact"><Text copyable>{user?.username ? `${user.username.toLowerCase()}@dashenbank.com` : 'N/A'}</Text></Descriptions.Item>
            <Descriptions.Item label="System Role"><Tag color="blue">{user?.role || 'N/A'}</Tag></Descriptions.Item>
            <Descriptions.Item label="Authorized Station">Dashen Bank S.C.</Descriptions.Item>
            <Descriptions.Item label="Account Status"><Tag color="success">ACTIVE</Tag></Descriptions.Item>
          </Descriptions>
        </div>
      </Modal>
    </Layout>
  );
};

export default DashboardLayout;
