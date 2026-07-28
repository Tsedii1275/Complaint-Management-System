import React, { useState, useEffect } from 'react';
import { Dropdown, Modal, Input, Button, Tag } from 'antd';
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
    complaintDescription: '',
    branch: '',
    date: '',
    preferredContactMethod: ''
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('');
  const [language, setLanguage] = useState('english');
  const [errors, setErrors] = useState({});
  const [countryCode, setCountryCode] = useState('+251');

  // Check Status States
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [ticketSearch, setTicketSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Ethiopian Date states
  const [ethMonth, setEthMonth] = useState('መስከረም');
  const [ethDay, setEthDay] = useState('1');
  const [ethYear, setEthYear] = useState('2018');

  // Evidence file attachment states
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  const countryCodes = [
    { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
    { code: '+1', flag: '🇺🇸', name: 'USA' },
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+254', flag: '🇰🇪', name: 'Kenya' },
    { code: '+253', flag: '🇩🇯', name: 'Djibouti' },
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' }
  ];

  // Translations
  const translations = {
    english: {
      title: 'Complaint Management System',
      subtitle: 'Submit your complaint and we will handle it promptly',
      formTitle: 'Customer Complaint Form',
      customerName: 'Customer Name',
      email: 'Email Address',
      phoneNumber: 'Mobile number you currently use',
      phoneHelper: 'Please provide the phone number currently in use so we can contact you regarding your complaint.',
      accountNumber: 'Account Number',
      complaintDescription: 'Complaint Description',
      complaintCategory: 'Complaint Category',
      branch: 'Branch',

      complaintDate: 'Complaint Date',
      submitButton: 'Submit Complaint',
      checkStatusTitle: 'Check Your Complaint Status',
      checkStatusDesc: 'Have you already submitted a complaint? Enter your ticket number to track its current progress.',
      trackButton: 'Track Complaint',
      modalTitle: 'Check Complaint Status',
      ticketLabel: 'Complaint Ticket Number',
      checkStatusBtn: 'Check Status',
      noTicketFound: 'No complaint found with the provided ticket number.',
      ticketNumber: 'Ticket Number',
      statusCustomerName: 'Customer Name',
      submissionDate: 'Submission Date',
      currentStatus: 'Current Status',
      contactMethod: 'Preferred Contact Method',
      contactMethodOptions: [
        { value: 'SMS', label: 'SMS' },
        { value: 'Email', label: 'Email' },
        { value: 'Both', label: 'Both' }
      ],
      selectContactMethod: '— Select preferred contact method —',
      consentText: 'I confirm that the information provided is accurate and complete to the best of my knowledge. I consent to the use of this information for the purpose of investigating and resolving my complaint.',
      consentError: 'You must agree before submitting your complaint.',
      categories: {
        financial: 'Financial - Banking Services',
        atm: 'ATM - Card Services',
        technical: 'Technical - System Issues',
        account: 'Account - Management',
        loan: 'Loan - Credit Services',
        branch: 'Branch - Customer Service',
        mobile: 'Mobile - App/Digital Banking',
        fraud: 'Fraud - Security Issues',
        employee_behaviour: 'Employee Behaviour - Staff Related',
        internet_banking: 'Internet Banking',
        super_app: 'Super App',
        general: 'General - Other Issues'
      },
      evidenceLabel: 'Evidence Attachment (Optional)',
      evidenceHelper: 'Upload any relevant documents, screenshots, or files to support your complaint (PDF, images, etc.).',
      evidenceUploading: 'Uploading...',
      evidenceUploaded: 'File uploaded successfully',
      evidenceRemove: 'Remove',
      evidenceChoose: 'Choose File',
      evidenceChange: 'Change File',
      evidenceDragDrop: 'or drag and drop your file here'
    },
    amharic: {
      title: 'የደንበኞች የቅሬታ ማቅረቢያ ቅጽ',
      subtitle: 'ቅሬታዎን እዚህ ያቅርቡ፤ በፍጥነት መፍትሄ ለመስጠት እንጥራለን።',
      formTitle: 'የደንበኞች የቅሬታ ማቅረቢያ ቅጽ',
      customerName: 'የደንበኛው ሙሉ ስም',
      email: 'የኢሜይል አድራሻ',
      phoneNumber: 'አሁን የሚጠቀሙበት የሞባይል ስልክ ቁጥር',
      phoneHelper: 'ቅሬታዎን በተመለከተ እንድንገናኝዎት እባክዎ በአሁኑ ጊዜ አገልግሎት ላይ ያለውን ስልክ ቁጥር ያቅርቡ።',
      accountNumber: 'የአካውንት ቁጥር',
      complaintDescription: 'የቅሬታው ዝርዝር መግለጫ',
      complaintCategory: 'የቅሬታ አይነት',
      branch: 'ቅርንጫፍ (አማራጭ)',
      selectBranch: 'ቅርንጫፍዎን ይምረጡ ወይም ያስገቡ (አማራጭ)',
      complaintDate: 'የቅሬታ ቀን',
      submitButton: 'ቅሬታውን ያስገቡ',
      checkStatusTitle: 'የቅሬታዎን ሁኔታ ያረጋግጡ',
      checkStatusDesc: 'ቅሬታ አስገብተዋል? የቅሬታዎን ሂደት ለመከታተል የቲኬት ቁጥርዎን ያስገቡ።',
      trackButton: 'ቅሬታ ይከታተሉ',
      modalTitle: 'የቅሬታ ሁኔታ ማረጋገጫ',
      ticketLabel: 'የቅሬታ ቲኬት ቁጥር',
      checkStatusBtn: 'ሁኔታውን እይ',
      noTicketFound: 'በተጠቀሰው የቲኬት ቁጥር የተመዘገበ ቅሬታ አልተገኘም።',
      ticketNumber: 'የቲኬት ቁጥር',
      statusCustomerName: 'የደንበኛው ስም',
      submissionDate: 'የገባበት ቀን',
      currentStatus: 'የአሁኑ ሁኔታ',
      contactMethod: 'ተመራጭ የመገናኛ ዘዴ',
      contactMethodOptions: [
        { value: 'SMS', label: 'ኤስኤምኤስ' },
        { value: 'Email', label: 'ኢሜይል ' },
        { value: 'Both', label: 'ሁለቱም' }
      ],
      selectContactMethod: '— ተመራጭ የመገናኛ ዘዴ ይምረጡ —',
      consentText: 'እኔ የቀረበው መረጃ ለእኔ እውቀት ትክክለኛ እና የተሟላ መሆኑን አረጋግጣለሁ። ይህ መረጃ ቅሬታዬን ለመመርመር እና ለመፍታት ጥቅም ላይ እንዲውል እስማማለሁ።',
      consentError: 'ቅሬታዎን ከማስገባትዎ በፊት መስማማት አለብዎት።',
      categories: {
        financial: 'ፋይናንሻል - የባንክ አገልግሎቶች',
        atm: 'ኤቲኤም - የካርድ አገልግሎቶች',
        technical: 'ቴክኒካዊ - የሲስተም ችግሮች',
        account: 'አካውንት - አስተዳደር',
        loan: 'ብድር - የብድር አገልግሎቶች',
        branch: 'ቅርንጫፍ - የደንበኞች አገልግሎት',
        mobile: 'ሞባይል - አፕ/ዲጂታል ባንኪንግ',
        fraud: 'ማጭበርበር - የደህንነት ጉዳዮች',
        employee_behaviour: 'የሰራተኞችን ባህሪ በተመለከተ',
        internet_banking: 'ኢንተርኔት ባንኪንግ',
        super_app: 'ሱፐር አፕ',
        general: 'አጠቃላይ - ሌሎች ጉዳዮች'
      },
      evidenceLabel: 'ማስረጃ ማያያዣ (አማራጭ)',
      evidenceHelper: 'ቅሬታዎን የሚደግፉ ማናቸውንም ሰነዶች፣ ምስሎች ወይም ፋይሎች ያያይዙ።',
      evidenceUploading: 'በመስቀል ላይ...',
      evidenceUploaded: 'ፋይል በተሳካ ሁኔታ ተሰቅሏል',
      evidenceRemove: 'አስወግድ',
      evidenceChoose: 'ፋይል ይምረጡ',
      evidenceChange: 'ፋይል ይቀይሩ',
      evidenceDragDrop: 'ወይም ፋይልዎን እዚህ ይጣሉ'
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

  // Synchronize Ethiopian date states to formData.date
  useEffect(() => {
    if (language === 'amharic') {
      setFormData(prev => ({
        ...prev,
        date: `${ethMonth} ${ethDay}, ${ethYear} (Ethiopian)`
      }));
    }
  }, [ethMonth, ethDay, ethYear, language]);

  // Handler for Gregorian date picker
  const handleGregorianDateChange = (e) => {
    setFormData(prev => ({
      ...prev,
      date: e.target.value
    }));
  };

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

    // Validate phone format - sanitize and merge with selected country code
    let rawPhone = formData.phone.trim();
    if (rawPhone.startsWith('0')) {
      rawPhone = rawPhone.substring(1);
    }
    if (rawPhone.startsWith(countryCode)) {
      rawPhone = rawPhone.substring(countryCode.length);
    } else if (rawPhone.startsWith('+')) {
      // If they typed another country code entirely on the right
      rawPhone = rawPhone.replace(/^\+\d+/, '');
    }

    let phone = countryCode + rawPhone;

    // Final validation before submission
    if (!formData.accountNumber || formData.accountNumber.length !== 13 || !/^\d+$/.test(formData.accountNumber)) {
      setErrors(prev => ({
        ...prev,
        accountNumber: language === 'english' ? 'Account Number is required and must be exactly 13 digits' : 'የአካውንት ቁጥር ያስፈልጋል እና በትክክል 13 አሃዝ መሆን አለበት'
      }));
      setIsSubmitting(false);
      return;
    }

    // Consent validation
    if (!consentChecked) {
      setErrors(prev => ({ ...prev, consent: t.consentError }));
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        customer: {
          name: formData.customerName,
          email: formData.email,
          phone: phone,
          accountNumber: formData.accountNumber,
          preferredLanguage: language
        },
        complaint: {
          channel: 'web',
          category: formData.complaintCategory,
          description: formData.complaintDescription,
          branch: formData.branch,
          date: formData.date,
          preferredContactMethod: formData.preferredContactMethod,
          evidenceUrl: evidenceUrl || undefined,
          evidenceName: evidenceName || undefined
        }
      };

      console.log('Submitting complaint with payload:', payload);
      const response = await ApiService.submitComplaint(payload);

      const ticketId = response.ticketId || response.ticketNumber;
      setMessageText(language === 'english'
        ? `Your complaint has been submitted. `
        : `ቅሬታዎ ገብቷል።`);
      setMessageType('success');

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setMessageText('');
        setMessageType('');
      }, 5000);

      // Reset form
      setFormData({
        customerName: '',
        email: '',
        phone: '',
        accountNumber: '',
        complaintCategory: 'general',
        complaintDescription: '',
        branch: '',
        date: '',
        preferredContactMethod: 'Email'
      });
      setConsentChecked(false);
      setErrors({});
      setEvidenceFile(null);
      setEvidenceUrl('');
      setEvidenceName('');

      console.log('Complaint submitted successfully:', response);
    } catch (error) {
      console.error('Error details:', error);
      let errorMessage = 'Failed to submit complaint. Please try again.';

      if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      setMessageText(errorMessage);
      setMessageType('error');

      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setMessageText('');
        setMessageType('');
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!ticketSearch.trim()) {
      setSearchError(language === 'english' ? 'Please enter a ticket number' : 'እባክዎ የቲኬት ቁጥር ያስገቡ');
      return;
    }
    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const response = await ApiService.checkComplaintStatus(ticketSearch.trim());
      setSearchResult(response);
    } catch (error) {
      console.error('Status check error:', error);
      if (error.message && error.message.includes('404')) {
        setSearchError(t.noTicketFound);
      } else {
        setSearchError(language === 'english' ? 'Failed to fetch status. Please try again.' : 'የቅሬታውን ሁኔታ ለማምጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const STATUS_LABEL_MAP = {
    'COMPLAINT_CREATED': { english: 'New', amharic: 'አዲስ ', color: 'green' },
    'TICKET_GENERATED': { english: 'New', amharic: 'አዲስ ', color: 'green' },
    'TASK_ASSIGNED': { english: 'Process Assigned', amharic: 'ሂደት ላይ ያለ', color: 'blue' },
    'TASK_COMPLETED': { english: 'Process Assigned', amharic: 'ሂደት ላይ ያለ', color: 'blue' },
    'TASK_STARTED': { english: 'Process Assigned', amharic: 'ሂደት ላይ ያለ', color: 'blue' },
    'CMD_CLASSIFICATION': { english: 'Process Assigned', amharic: 'ሂደት ላይ ያለ', color: 'blue' },
    'NOTIFICATION_SENT': { english: 'Solved', amharic: 'የተፈታ', color: 'cyan' },
    'CASE_CLOSED': { english: 'Closed', amharic: 'የተዘጋ', color: 'gray' },
  };

  const getStatusTag = (action) => {
    const mapped = STATUS_LABEL_MAP[action];
    const label = mapped ? mapped[language] : action;
    const color = mapped ? mapped.color : 'blue';
    return (
      <Tag color={color} style={{ fontSize: '14px', padding: '4px 12px', borderRadius: '4px', border: 'none', fontWeight: 600 }}>
        {label}
      </Tag>
    );
  };

  const formatSubmissionDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === 'english' ? 'en-US' : 'am-ET', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className={language === 'amharic' ? 'amharic-lightweight' : ''} style={{ minHeight: '100vh', backgroundColor: '#fcfcfc', display: 'flex', flexDirection: 'column' }}>
      {language === 'amharic' && (
        <style>
          {`
            .amharic-lightweight, 
            .amharic-lightweight * {
              font-weight: 300 !important;
            }
          `}
        </style>
      )}
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

      {/* Main Content - Two Column Layout */}
      <div style={{
        flex: 1,
        padding: '40px 80px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '40px',
        flexWrap: 'wrap',
        maxWidth: '1300px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Left Column - Main Form */}
        <div style={{
          flex: '3 1 600px',
          backgroundColor: '#fff',
          padding: '40px',
          border: '1px solid #e0e0e0',
          borderRadius: '2px',
          boxShadow: 'none',
          boxSizing: 'border-box'
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
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                  {t.email}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
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
            </div>

            {/* Row 2: Phone and Account */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                  {t.phoneNumber} <span style={{ color: 'red' }}>*</span>
                </label>
                <div style={{ display: 'flex' }}>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    style={{
                      padding: '12px',
                      border: '1px solid #dcdcdc',
                      borderRight: 'none',
                      borderRadius: '4px 0 0 4px',
                      fontSize: '15px',
                      backgroundColor: '#f8f9fa',
                      outline: 'none',
                      cursor: 'pointer',
                      width: '110px',
                      color: BRAND_COLORS.primary,
                      fontWeight: 500
                    }}
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid #dcdcdc',
                      borderRadius: '0 4px 4px 0',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#888', lineHeight: 1.5 }}>
                  {t.phoneHelper}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                  {t.accountNumber} <span style={{ color: 'red' }}>*</span>
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
                />
                {errors.accountNumber && (
                  <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                    {errors.accountNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Branch and Date */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                  {t.branch}
                </label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  placeholder={t.selectBranch}
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
                  {t.complaintDate} <span style={{ color: 'red' }}>*</span>
                </label>
                {language === 'english' ? (
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleGregorianDateChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      border: '1px solid #dcdcdc',
                      borderRadius: '4px',
                      fontSize: '15px',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={ethMonth}
                      onChange={(e) => setEthMonth(e.target.value)}
                      style={{
                        flex: 2,
                        padding: '12px 8px',
                        border: '1px solid #dcdcdc',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        outline: 'none'
                      }}
                    >
                      <option value="መስከረም">መስከረም</option>
                      <option value="ጥቅምት">ጥቅምት</option>
                      <option value="ኅዳር">ኅዳር</option>
                      <option value="ታኅሣሥ">ታኅሣሥ</option>
                      <option value="ጥር">ጥር</option>
                      <option value="የካቲት">የካቲት</option>
                      <option value="መጋቢት">መጋቢት</option>
                      <option value="ሚያዝያ">ሚያዝያ</option>
                      <option value="ግንቦት">ግንቦት</option>
                      <option value="ሰኔ">ሰኔ</option>
                      <option value="ሐምሌ">ሐምሌ</option>
                      <option value="ነሐሴ">ነሐሴ</option>
                      <option value="ጳጉሜ">ጳጉሜ</option>
                    </select>
                    <select
                      value={ethDay}
                      onChange={(e) => setEthDay(e.target.value)}
                      style={{
                        flex: 1.2,
                        padding: '12px 8px',
                        border: '1px solid #dcdcdc',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        outline: 'none'
                      }}
                    >
                      {Array.from({ length: ethMonth === 'ጳጉሜ' ? 6 : 30 }, (_, i) => String(i + 1)).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    <select
                      value={ethYear}
                      onChange={(e) => setEthYear(e.target.value)}
                      style={{
                        flex: 1.5,
                        padding: '12px 8px',
                        border: '1px solid #dcdcdc',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        outline: 'none'
                      }}
                    >
                      <option value="2018">2018</option>
                      <option value="2017">2017</option>
                      <option value="2016">2016</option>
                      <option value="2015">2015</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Category */}
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
                <option value="employee_behaviour">{t.categories.employee_behaviour}</option>
                <option value="internet_banking">{t.categories.internet_banking}</option>
                <option value="super_app">{t.categories.super_app}</option>
                <option value="general">{t.categories.general}</option>
              </select>
            </div>

            {/* Row 5: Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                {t.complaintDescription} <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                name="complaintDescription"
                value={formData.complaintDescription}
                onChange={handleInputChange}
                required
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

            {/* Row 6: Evidence Attachment (Optional) */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                {t.evidenceLabel}
              </label>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#888' }}>
                {t.evidenceHelper}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  id="evidence-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setEvidenceFile(file);
                      setIsUploadingEvidence(true);
                      try {
                        const result = await ApiService.uploadEvidence(file);
                        setEvidenceUrl(result.url);
                        setEvidenceName(result.fileName);
                      } catch (err) {
                        console.error('Evidence upload failed:', err);
                        setMessageType('error');
                        setMessageText('Failed to upload evidence file. Please try again.');
                      } finally {
                        setIsUploadingEvidence(false);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('evidence-file-input').click()}
                  disabled={isUploadingEvidence}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    color: '#444',
                    border: '1px solid #dcdcdc',
                    borderRadius: '4px',
                    cursor: isUploadingEvidence ? 'not-allowed' : 'pointer',
                    opacity: isUploadingEvidence ? 0.7 : 1,
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (!isUploadingEvidence) {
                      e.currentTarget.style.borderColor = BRAND_COLORS.primary;
                      e.currentTarget.style.color = BRAND_COLORS.primary;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isUploadingEvidence) {
                      e.currentTarget.style.borderColor = '#dcdcdc';
                      e.currentTarget.style.color = '#444';
                    }
                  }}
                >
                  <span style={{ fontSize: '16px' }}>📎</span>
                  {isUploadingEvidence ? t.evidenceUploading : (evidenceUrl ? t.evidenceChange : t.evidenceChoose)}
                </button>
                {evidenceName && (
                  <span style={{ color: '#166534', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {evidenceName}
                  </span>
                )}
                {evidenceUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceFile(null);
                      setEvidenceUrl('');
                      setEvidenceName('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px'
                    }}
                    title={t.evidenceRemove}
                  >
                    ×
                  </button>
                )}
              </div>

            </div>

            {/* Preferred Contact Method */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
                {t.contactMethod} <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                name="preferredContactMethod"
                value={formData.preferredContactMethod}
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
                  cursor: 'pointer',
                  color: formData.preferredContactMethod ? '#222' : '#aaa',
                  appearance: 'auto'
                }}
              >
                <option value="" disabled>{t.selectContactMethod}</option>
                {t.contactMethodOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Consent Checkbox */}
            <div style={{ marginBottom: '32px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
              <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => {
                    setConsentChecked(e.target.checked);
                    if (e.target.checked) {
                      setErrors(prev => { const n = { ...prev }; delete n.consent; return n; });
                    }
                  }}
                  style={{ accentColor: '#012169', width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: '13px', color: '#444', lineHeight: 1.6 }}>
                  {t.consentText} <span style={{ color: 'red' }}>*</span>
                </span>
              </label>
              {errors.consent && (
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px', marginLeft: '30px' }}>
                  {errors.consent}
                </div>
              )}
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

        {/* Right Column - Status Checker Card */}
        <div style={{
          flex: '1 1 300px',
          backgroundColor: '#fff',
          padding: '30px',
          border: '1px solid #e0e0e0',
          borderRadius: '2px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: BRAND_COLORS.primary }}>
            {t.checkStatusTitle}
          </h3>
          <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: 1.6 }}>
            {t.checkStatusDesc}
          </p>
          <button
            onClick={() => setIsStatusModalOpen(true)}
            style={{
              backgroundColor: 'white',
              color: BRAND_COLORS.primary,
              border: `2px solid ${BRAND_COLORS.primary}`,
              padding: '12px 20px',
              borderRadius: '4px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              width: '100%',
              textAlign: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = BRAND_COLORS.primary;
              e.currentTarget.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = BRAND_COLORS.primary;
            }}
          >
            {t.trackButton}
          </button>
        </div>

        {/* Modal for checking status */}
        <Modal
          title={
            <div style={{ fontSize: '20px', fontWeight: 700, color: BRAND_COLORS.primary, paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>
              {t.modalTitle}
            </div>
          }
          open={isStatusModalOpen}
          onCancel={() => {
            setIsStatusModalOpen(false);
            setTicketSearch('');
            setSearchResult(null);
            setSearchError('');
          }}
          footer={null}
          width={500}
          centered
        >
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444', fontSize: '14px' }}>
              {t.ticketLabel}
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <Input
                placeholder="e.g. CM-202606170001-AB12CD34"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                onPressEnter={handleCheckStatus}
                style={{ flex: 1, padding: '10px 16px', fontSize: '15px', borderRadius: '4px' }}
              />
              <Button
                type="primary"
                onClick={handleCheckStatus}
                loading={isSearching}
                style={{
                  backgroundColor: BRAND_COLORS.primary,
                  borderColor: BRAND_COLORS.primary,
                  height: 'auto',
                  padding: '10px 24px',
                  fontSize: '15px',
                  fontWeight: '600',
                  borderRadius: '4px'
                }}
              >
                {t.checkStatusBtn}
              </Button>
            </div>

            {searchError && (
              <div style={{
                padding: '12px',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '20px',
                fontWeight: 500
              }}>
                {searchError}
              </div>
            )}

            {searchResult && (
              <div style={{
                padding: '24px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div>
                  <span style={{ display: 'block', color: '#888', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t.ticketNumber}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: BRAND_COLORS.primary }}>
                    {searchResult.ticketNumber}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 180px' }}>
                    <span style={{ display: 'block', color: '#888', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t.statusCustomerName}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 500, color: '#333' }}>
                      {searchResult.customerName}
                    </span>
                  </div>
                  <div style={{ flex: '1 1 180px' }}>
                    <span style={{ display: 'block', color: '#888', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t.submissionDate}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 500, color: '#333' }}>
                      {formatSubmissionDate(searchResult.submissionDate)}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ display: 'block', color: '#888', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    {t.currentStatus}
                  </span>
                  {getStatusTag(searchResult.currentStatus)}
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default CustomerForm;
