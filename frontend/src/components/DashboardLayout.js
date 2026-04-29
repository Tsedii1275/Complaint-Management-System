import React, { useState } from 'react';
import { Layout, Typography, Avatar, Dropdown, Button, Menu, Grid, Drawer } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { BRAND_COLORS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import '../index.css';

const { Header: AntHeader, Sider, Content } = Layout;
const { Title, Text } = Typography;

function SidebarMenu({ collapsed, userRole }) {
  const location = useLocation();
  
  const menuItems = [
    {
      key: `/${userRole}`,
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
  ];

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      style={{ borderRight: 'none', padding: '0 8px' }}
    />
  );
}

function AppHeader({ collapsed, setCollapsed, userRole, onLogout }) {
  const userMenu = {
    items: [
      {
        key: 'profile',
        label: 'My Profile',
        icon: <UserOutlined />,
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
    const titles = {
      'branch-staff': 'Branch Staff',
      'cmd': 'CMD Officer',
      'audit': 'Audit Team',
      'work-unit': 'Work Unit',
      'service-quality': 'Service Quality'
    };
    return titles[role] || 'Dashboard';
  };

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
          Complaint Management <span style={{ fontWeight: 400, opacity: 0.85, fontSize: '15px' }} className="hide-on-mobile">| {getRoleTitle(userRole)}</span>
        </Title>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{
          borderRadius: '4px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white',
          width: '280px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          height: '32px'
        }} className="header-search hide-on-mobile">
          <SearchOutlined style={{ color: 'rgba(255,255,255,0.6)', marginRight: '8px' }} />
          <input
            placeholder="Search..."
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              outline: 'none',
              width: '100%',
              fontSize: '14px'
            }}
          />
        </div>
        <BellOutlined style={{ fontSize: '18px', cursor: 'pointer', color: BRAND_COLORS.white }} />
        <Dropdown menu={userMenu} trigger={['click']}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <Avatar style={{ backgroundColor: BRAND_COLORS.accent, color: BRAND_COLORS.primary, fontWeight: 'bold' }}>
              {userRole.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }} className="hide-on-mobile">
              <Text style={{ color: BRAND_COLORS.white, fontWeight: 500 }}>
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)} User
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                {getRoleTitle(userRole)}
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
  const navigate = useNavigate();
  const { logout } = useAuth();
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
        onLogout={handleLogout}
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
            <SidebarMenu collapsed={collapsed} userRole={userRole} />
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
          <SidebarMenu collapsed={false} userRole={userRole} />
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
    </Layout>
  );
};

export default DashboardLayout;
