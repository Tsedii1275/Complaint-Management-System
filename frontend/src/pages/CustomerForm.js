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
    // Disabled restricted test call to avoid 401 errors for customers
    console.log('Customer form initialized');
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
    <div style={{ minHeight: '100vh', backgroundColor: '#fcfcfc', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Left Aligned */}
      <div style={{
        backgroundColor: '#fff',
        color: BRAND_COLORS.primary,
        padding: '40px 80px 20px 80px',
        position: 'relative',
        borderBottom: '2px solid #012169'
      }}>
        {/* Language Selector */}
        <div style={{ 
          position: 'absolute', 
          top: '40px', 
          right: '80px',
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
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: '4px',
              cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease'
            }}>
              <GlobalOutlined style={{ fontSize: '16px', color: BRAND_COLORS.primary }} />
              <span style={{ fontSize: '14px', color: BRAND_COLORS.primary, fontWeight: 500 }}>
                {language === 'english' ? 'English' : 'አማርኛ'}
              </span>
            </div>
          </Dropdown>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '20px', marginBottom: '16px' }}>
          <img
            src="/download.png"
            alt="Dashen Bank Logo"
            style={{ height: '60px', width: 'auto' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: BRAND_COLORS.primary, letterSpacing: '-0.5px' }}>
              {t.subtitle}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content - Paper Form Style */}
      <div style={{ flex: 1, padding: '40px 80px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '100%',
          maxWidth: '900px',
          backgroundColor: '#fff',
          padding: '40px',
          border: '1px solid #e0e0e0',
          borderRadius: '2px',
          boxShadow: 'none'
        }}>
          <h2 style={{ textAlign: 'left', marginBottom: '40px', color: BRAND_COLORS.primary, fontSize: '24px', fontWeight: 700, borderBottom: '1px solid #f0f0f0', paddingBottom: '15px' }}>
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
            {/* Row 1: Name and Email */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
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
                    padding: '12px 16px',
                    border: '1px solid #dcdcdc',
                    borderRadius: '4px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  placeholder={t.placeholders.customerName}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
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
                    padding: '12px 16px',
                    border: '1px solid #dcdcdc',
                    borderRadius: '4px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  placeholder={t.placeholders.email}
                />
              </div>
            </div>

            {/* Row 2: Phone and Account */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
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
                    padding: '12px 16px',
                    border: '1px solid #dcdcdc',
                    borderRadius: '4px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                  {t.accountNumber} <span style={{ color: '#888', fontSize: '12px', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  maxLength={13}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${errors.accountNumber ? '#ff4d4f' : '#dcdcdc'}`,
                    borderRadius: '4px',
                    fontSize: '15px',
                    transition: 'border-color 0.2s',
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
            </div>

            {/* Row 3: Category */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                {t.complaintCategory} <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                name="complaintCategory"
                value={formData.complaintCategory}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #dcdcdc',
                  borderRadius: '4px',
                  fontSize: '15px',
                  backgroundColor: 'white',
                  outline: 'none',
                  cursor: 'pointer'
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

            {/* Row 4: Description */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                {t.complaintDescription} <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                name="complaintDescription"
                value={formData.complaintDescription}
                onChange={handleInputChange}
                required
                placeholder={t.placeholders.complaintDescription}
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #dcdcdc',
                  borderRadius: '4px',
                  fontSize: '15px',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s'
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
