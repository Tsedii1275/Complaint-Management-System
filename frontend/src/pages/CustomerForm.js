import React, { useState, useEffect } from 'react';
import { Dropdown } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { BRAND_COLORS } from '../constants/theme';
import ApiService from '../services/api';

function CustomerForm() {
  const [formData, setFormData] = useState({
    customerName: '',
    email: '',
    phone: '',
    accountNumber: '',
    complaintCategory: 'general',
    complaintDescription: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('');
  const [language, setLanguage] = useState('english');
  const [errors, setErrors] = useState({});

  // Translations
  const translations = {
    english: {
      title: 'Complaint Management System',
      subtitle: 'Submit your complaint and we will handle it promptly',
      formTitle: 'Customer Complaint Form',
      customerName: 'Customer Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      accountNumber: 'Account Number',
      complaintDescription: 'Complaint Description',
      complaintCategory: 'Complaint Category',
      submitButton: 'Submit Complaint',
      categories: {
        financial: 'Financial - Banking Services',
        atm: 'ATM - Card Services',
        technical: 'Technical - System Issues',
        account: 'Account - Management',
        loan: 'Loan - Credit Services',
        branch: 'Branch - Customer Service',
        mobile: 'Mobile - App/Digital Banking',
        fraud: 'Fraud - Security Issues',
        general: 'General - Other Issues'
      },
      placeholders: {
        customerName: 'Enter your full name',
        email: 'Enter your email address',
        phoneNumber: '+2519XXXXXXXX',
        accountNumber: 'Enter your account number',
        complaintDescription: 'Describe your complaint in detail'
      }
    },
    amharic: {
      title: 'የደንበኞች የቅሬታ ማቅረቢያ ቅጽ',
      subtitle: 'ቅሬታዎን እዚህ ያቅርቡ፤ በፍጥነት መፍትሄ ለመስጠት እንጥራለን።',
      formTitle: 'የደንበኞች የቅሬታ ማቅረቢያ ቅጽ',
      customerName: 'የደንበኛው ሙሉ ስም',
      email: 'ኢሜይል',
      phoneNumber: 'ስልክ ቁጥር',
      accountNumber: 'የአካውንት ቁጥር',
      complaintDescription: 'የቅሬታው ዝርዝር መግለጫ',
      complaintCategory: 'የቅሬታ አይነት',
      submitButton: 'ቅሬታውን ያስገቡ',
      categories: {
        financial: 'ፋይናንሻል - የባንክ አገልግሎቶች',
        atm: 'ኤቲኤም - የካርድ አገልግሎቶች',
        technical: 'ቴክኒካዊ - የሲስተም ችግሮች',
        account: 'አካውንት - አስተዳደር',
        loan: 'ብድር - የብድር አገልግሎቶች',
        branch: 'ቅርንጫፍ - የደንበኞች አገልግሎት',
        mobile: 'ሞባይል - አፕ/ዲጂታል ባንኪንግ',
        fraud: 'ማጭበርበር - የደህንነት ጉዳዮች',
        general: 'አጠቃላይ - ሌሎች ጉዳዮች'
      },
      placeholders: {
        customerName: 'ሙሉ ስምዎን እዚህ ያስገቡ',
        email: 'ኢሜይል አድራሻዎን ያስገቡ',
        phoneNumber: '+2519XXXXXXXX',
        accountNumber: 'የአካውንት ቁጥርዎን ያስገቡ',
        complaintDescription: 'የቅሬታዎን ዝርዝር እዚህ ይግለጹ'
      }
    }
  };

  const t = translations[language];

  // Language menu items
  const languageMenuItems = [
    {
      key: 'english',
      label: 'English',
      icon: <span>🇺🇸</span>,
      onClick: () => setLanguage('english')
    },
    {
      key: 'amharic',
      label: 'አማርኛ',
      icon: <span>🇪🇹</span>,
      onClick: () => setLanguage('amharic')
    }
  ];

  // Test API connection on component mount
  useEffect(() => {
    const testApi = async () => {
      try {
        await ApiService.getTasks();
        console.log('✅ API connection working');
      } catch (error) {
        console.error('❌ API connection failed:', error);
        setMessageText('Cannot connect to backend. Please ensure the backend is running on localhost:8080');
        setMessageType('error');
      }
    };
    testApi();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Real-time validation for account number
    if (name === 'accountNumber') {
      if (value && (value.length !== 13 || !/^\d+$/.test(value))) {
        setErrors(prev => ({
          ...prev,
          accountNumber: language === 'english' ? 'Must be exactly 13 digits' : 'በትክክል 13 አሃዝ መሆን አለበት'
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    // Handle both DOM event and Ant Design onFinish
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setIsSubmitting(true);
    setMessageText('');

    // Validate phone format - convert to +251 format if needed
    let phone = formData.phone;
    if (phone.startsWith('09')) {
      phone = '+251' + phone.substring(1);
    } else if (phone.startsWith('9')) {
      phone = '+251' + phone;
    }

    // Final validation before submission
    if (formData.accountNumber && (formData.accountNumber.length !== 13 || !/^\d+$/.test(formData.accountNumber))) {
      setErrors(prev => ({
        ...prev,
        accountNumber: language === 'english' ? 'Must be exactly 13 digits' : 'በትክክል 13 አሃዝ መሆን አለበት'
      }));
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        customer: {
          name: formData.customerName,
          email: formData.email,
          phone: phone,
          accountNumber: formData.accountNumber
        },
        complaint: {
          channel: 'web',
          category: formData.complaintCategory,
          description: formData.complaintDescription
        }
      };

      console.log('Submitting complaint with payload:', payload);
      const response = await ApiService.submitComplaint(payload);
      
      setMessageText('Your complaint has been submitted. You will receive a ticket number via email.');
      setMessageType('success');
      
      // Reset form
      setFormData({
        customerName: '',
        email: '',
        phone: '',
        accountNumber: '',
        complaintCategory: 'general',
        complaintDescription: ''
      });
      
      console.log('Complaint submitted successfully:', response);
    } catch (error) {
      console.error('Error details:', error);
      let errorMessage = 'Failed to submit complaint. Please try again.';
      
      if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setMessageText(errorMessage);
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BRAND_COLORS.background, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        backgroundColor: BRAND_COLORS.primary,
        color: 'white',
        padding: '20px 40px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'relative'
      }}>
        {/* Language Selector */}
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '40px',
          zIndex: 10
        }}>
          <Dropdown
            menu={{ items: languageMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
            }}
            >
              <GlobalOutlined style={{ fontSize: '16px', color: 'white' }} />
              <span style={{ fontSize: '14px', color: 'white', fontWeight: 500 }}>
                {language === 'english' ? 'English' : 'አማርኛ'}
              </span>
              <span style={{ fontSize: '16px' }}>
                {language === 'english' ? '🇺🇸' : '🇪🇹'}
              </span>
            </div>
          </Dropdown>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <img
            src="/download.png"
            alt="Dashen Bank Logo"
            style={{ height: '40px', width: 'auto' }}
          />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            {t.title}
          </h1>
        </div>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>
          {t.subtitle}
        </p>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{
          width: '100%',
          maxWidth: '600px',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: BRAND_COLORS.primary }}>
            {t.formTitle}
          </h2>
          
          {messageText && (
            <div style={{
              padding: '12px',
              marginBottom: '20px',
              backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
              color: messageType === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '6px'
            }}>
              {messageText}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                {t.customerName} <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s'
                }}
                placeholder={t.placeholders.customerName}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                {t.email} <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s'
                }}
                placeholder={t.placeholders.email}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                {t.phoneNumber} <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder={t.placeholders.phoneNumber}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                {t.accountNumber} <span style={{ color: '#666', fontSize: '12px' }}>(optional)</span>
              </label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                maxLength={13}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${errors.accountNumber ? '#ff4d4f' : '#ddd'}`,
                  borderRadius: '6px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s',
                  outline: 'none'
                }}
                placeholder={t.placeholders.accountNumber}
              />
              {errors.accountNumber && (
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                  {errors.accountNumber}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                {t.complaintCategory} <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                name="complaintCategory"
                value={formData.complaintCategory}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  transition: 'border-color 0.3s'
                }}
              >
                <option value="financial">{t.categories.financial}</option>
                <option value="atm">{t.categories.atm}</option>
                <option value="technical">{t.categories.technical}</option>
                <option value="account">{t.categories.account}</option>
                <option value="loan">{t.categories.loan}</option>
                <option value="branch">{t.categories.branch}</option>
                <option value="mobile">{t.categories.mobile}</option>
                <option value="fraud">{t.categories.fraud}</option>
                <option value="general">{t.categories.general}</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                {t.complaintDescription} <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                name="complaintDescription"
                value={formData.complaintDescription}
                onChange={handleInputChange}
                required
                placeholder={t.placeholders.complaintDescription}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  resize: 'vertical',
                  transition: 'border-color 0.3s'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: BRAND_COLORS.primary,
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                fontSize: '16px',
                fontWeight: '500',
                width: '100%',
                transition: 'all 0.3s ease'
              }}
            >
              {isSubmitting ? (language === 'english' ? 'Submitting...' : 'በመልክያል...') : t.submitButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CustomerForm;
