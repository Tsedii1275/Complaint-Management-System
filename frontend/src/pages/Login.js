import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, Layout } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { BRAND_COLORS } from '../constants/theme';
import ApiService from '../services/api';
import { getRouteForRole } from '../constants/authRoutes';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const { Content } = Layout;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');

    try {
      const username = values.username.toLowerCase();
      const response = await ApiService.login(username, values.password);
      
      // response should have { token, username, role }
      const userData = {
        username: response.username,
        role: response.role,
        token: response.token
      };

      login(userData);
      
      // Redirect based on role
      const targetRoute = getRouteForRole(response.role);
      navigate(targetRoute);
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      style={{
        minHeight: '100vh',
        backgroundColor: BRAND_COLORS.background
      }}
    >
      <Content
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 8px 32px rgba(1, 33, 105, 0.1)',
            borderRadius: '16px',
            border: 'none'
          }}
          bodyStyle={{ padding: '40px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img
              src="/download.png"
              alt="Dashen Bank Logo"
              style={{ height: '48px', marginBottom: '16px' }}
            />
            <Title level={3} style={{ color: BRAND_COLORS.primary, margin: '0 0 20px 0' }}>
              Complaint Management
            </Title>
            <Text type="secondary" style={{ marginTop: '50px', marginBottom: '-80px' }}>Please login to your account</Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: '24px' }}
            />
          )}

          <Form name="login" onFinish={onFinish} layout="vertical" size="large">
            
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please input your username!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Username"
                style={{ borderRadius: 0 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                style={{ borderRadius: 0  , marginTop: '-20px' }}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: 0
                }}
              >
                Login
              </Button>
            </Form.Item>

          </Form>
        </Card>
      </Content>

      {/* Global override (optional but recommended) */}
      <style>
        {`
    .ant-input-affix-wrapper {
  border: none !important;
  box-shadow: none !important;
}

      
        `}
      </style>

    </Layout>
  );
};

export default Login;