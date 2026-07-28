import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, Select, Input, Space, Button, Alert, Row, Col, Tabs, Modal, Form, message, Spin } from 'antd';
import { DownloadOutlined, PrinterOutlined, FileExcelOutlined, EditOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import ApiService from '../services/api';
import { BRAND_COLORS } from '../constants/theme';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

function NBEReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportsData, setReportsData] = useState([]);
  
  // Filters
  const [annex1Month, setAnnex1Month] = useState(moment().format('MM'));
  const [annex1Year, setAnnex1Year] = useState(moment().format('YYYY'));
  const [searchText, setSearchText] = useState('');

  // Editing comments modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [savingComments, setSavingComments] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ApiService.getNbeReportsData();
      setReportsData(data || []);
    } catch (err) {
      setError('Failed to fetch NBE report data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Filtering for Annex 1 ---
  const filteredAnnex1 = reportsData.filter(row => {
    if (!row.lodgedDate) return false;
    const lodged = moment(row.lodgedDate);
    const monthMatch = annex1Month === 'ALL' || lodged.format('MM') === annex1Month;
    const yearMatch = lodged.format('YYYY') === annex1Year;
    
    const searchLower = searchText.toLowerCase();
    const searchMatch = !searchText || 
      (row.complaintId || '').toLowerCase().includes(searchLower) ||
      (row.complainantName || '').toLowerCase().includes(searchLower);

    return monthMatch && yearMatch && searchMatch;
  });

  // --- Filtering for Annex 2 ---
  // Only include unresolved, open for more than 10 business days, SLA = OVERDUE or BREACHED
  const filteredAnnex2 = reportsData.filter(row => {
    const isUnresolved = !row.resolvedDate;
    const isOverdue = row.slaStatus === 'OVERDUE' || row.slaStatus === 'BREACHED';
    const isLongStanding = row.daysOpen >= 10;
    
    const searchLower = searchText.toLowerCase();
    const searchMatch = !searchText || 
      (row.complaintId || '').toLowerCase().includes(searchLower) ||
      (row.complainantName || '').toLowerCase().includes(searchLower);

    return isUnresolved && isOverdue && isLongStanding && searchMatch;
  });

  // --- Handle Edit Comments ---
  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      reasonForNonResolution: record.reasonForNonResolution || '',
      additionalComments: record.additionalComments || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveComments = async () => {
    try {
      setSavingComments(true);
      const values = await form.validateFields();
      
      await ApiService.updateNbeVariables(editingRecord.processInstanceId, {
        reasonForNonResolution: values.reasonForNonResolution,
        additionalComments: values.additionalComments
      });

      message.success('NBE report comments updated successfully!');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      message.error(err.message || 'Failed to update NBE comments.');
    } finally {
      setSavingComments(false);
    }
  };

  // --- Export Excel function ---
  const handleExportExcel = (annexType, filename) => {
    let cleanTableHtml = '';
    if (annexType === 'annex1') {
      cleanTableHtml = buildPrintTable(columnsAnnex1, filteredAnnex1);
    } else {
      cleanTableHtml = buildPrintTable(columnsAnnex2, filteredAnnex2);
    }
    
    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorkbook></xml><![endif]--></head>
      <body>${cleanTableHtml}</body>
      </html>
    `;
    
    const url = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(template);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${moment().format('YYYYMMDD')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Print helpers ---
  const buildPrintTable = (columns, data) => {
    let html = '<table style="border-collapse: collapse; width: 100%; font-size: 11px; margin-top: 15px; margin-bottom: 30px;">';
    
    // Header row
    html += '<thead><tr style="background-color: #f2f2f2;">';
    columns.forEach(col => {
      if (col.key !== 'actions') {
        html += `<th style="border: 1px solid #000; padding: 6px; text-align: left;">${col.title}</th>`;
      }
    });
    html += '</tr></thead>';
    
    // Body rows
    html += '<tbody>';
    if (data.length === 0) {
      const colSpan = columns.filter(c => c.key !== 'actions').length;
      html += `<tr><td colspan="${colSpan}" style="border: 1px solid #000; padding: 12px; text-align: center; color: #888; font-style: italic;">No complaints found for the selected period.</td></tr>`;
    } else {
      data.forEach((row, i) => {
        html += '<tr>';
        columns.forEach(col => {
          if (col.key !== 'actions') {
            let val = '-';
            if (col.key === 'index') {
              val = i + 1;
            } else if (col.key === 'lodgedDate' || col.key === 'resolvedDate') {
              val = row[col.dataIndex] ? moment(row[col.dataIndex]).format('YYYY-MM-DD') : '-';
            } else if (col.key === 'daysOpen') {
              val = `${row[col.dataIndex] || 0} Days`;
            } else {
              val = row[col.dataIndex] || '-';
            }
            html += `<td style="border: 1px solid #000; padding: 6px; text-align: left;">${val}</td>`;
          }
        });
        html += '</tr>';
      });
    }
    html += '</tbody>';
    html += '</table>';
    return html;
  };

  // --- Print/PDF function ---
  const handlePrint = (annexType) => {
    let titleHtml = '';
    let tableHtml = '';
    
    if (annexType === 'annex1') {
      const monthLabel = annex1Month === 'ALL' ? 'All Months (One Year)' : moment(`${annex1Year}-${annex1Month}-01`).format('MMMM');
      titleHtml = `
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #012169;">Annex 1 – Complaints Handling Report</h2>
          <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">Dashen Bank S.C.</h3>
          <h4 style="margin: 0; font-size: 14px; font-weight: 500;">
            For: <span style="border-bottom: 1px solid #000; padding: 0 12px; font-weight: bold;">${monthLabel}, ${annex1Year}</span>
          </h4>
        </div>
      `;
      tableHtml = buildPrintTable(columnsAnnex1, filteredAnnex1);
    } else {
      titleHtml = `
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #012169;">Annex 2 – Notification Letter to NBE</h2>
          <h3 style="margin: 0 0 5px 0; font-size: 15px; font-weight: bold; color: #555;">For Complaints Not Resolved Within 10 Business Days</h3>
          <h4 style="margin: 0; font-size: 13px; font-weight: 400;">Reporting Entity: Dashen Bank S.C.</h4>
        </div>
      `;
      tableHtml = buildPrintTable(columnsAnnex2, filteredAnnex2);
    }

    const printHtml = `
      <html>
        <head>
          <title>NBE Compliance Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            table { border-collapse: collapse; width: 100%; margin-top: 15px; margin-bottom: 30px; font-size: 11px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            h1, h2, h3 { text-align: center; margin: 5px 0; color: #012169; }
            .footer-section { margin-top: 50px; font-size: 12px; page-break-inside: avoid; }
            .footer-row { display: flex; justify-content: space-between; margin-top: 40px; }
            .footer-col { width: 30%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
          </style>
        </head>
        <body>
          ${titleHtml}
          ${tableHtml}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const columnsAnnex1 = [
    { title: 'No.', dataIndex: 'index', key: 'index', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Date Complaint Lodged', dataIndex: 'lodgedDate', key: 'lodgedDate', render: date => date ? moment(date).format('YYYY-MM-DD') : '-' },
    { title: 'Complaint ID No.', dataIndex: 'complaintId', key: 'complaintId' },
    { title: 'Complainant Name', dataIndex: 'complainantName', key: 'complainantName' },
    { title: 'Mobile', dataIndex: 'mobile', key: 'mobile' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Issues Raised', dataIndex: 'issuesRaised', key: 'issuesRaised', ellipsis: true },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: status => {
        let color = 'blue';
        if (status === 'Resolved') color = 'green';
        if (status === 'Escalated') color = 'orange';
        if (status === 'Referred to NBE') color = 'magenta';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    { title: 'No. of Days Issue Takes', dataIndex: 'daysOpen', key: 'daysOpen', render: val => `${val} Days` },
    { title: 'Name of Staff Handling', dataIndex: 'staffHandling', key: 'staffHandling' }
  ];

  const columnsAnnex2 = [
    { title: 'Date Complaint Lodged', dataIndex: 'lodgedDate', key: 'lodgedDate', render: date => date ? moment(date).format('YYYY-MM-DD') : '-' },
    { title: 'Complainant Name', dataIndex: 'complainantName', key: 'complainantName' },
    { title: 'Complaint ID', dataIndex: 'complaintId', key: 'complaintId' },
    { title: 'Staff Handling Complaint', dataIndex: 'staffHandling', key: 'staffHandling' },
    { title: 'Complaint Details', dataIndex: 'issuesRaised', key: 'issuesRaised', ellipsis: true },
    { title: 'Number of Days Open', dataIndex: 'daysOpen', key: 'daysOpen', render: val => `${val} Days` },
    { title: 'Reason for Non-Resolution', dataIndex: 'reasonForNonResolution', key: 'reasonForNonResolution', render: text => text || <Text type="secondary" italic>No reason added</Text> },
    { title: 'Additional Comments', dataIndex: 'additionalComments', key: 'additionalComments', render: text => text || <Text type="secondary" italic>No comments added</Text> },
    { 
      title: 'Actions', 
      key: 'actions', 
      width: 130, 
      render: (_, record) => (
        <Button 
          type="primary" 
          ghost 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => openEditModal(record)}
        >
          Edit Comments
        </Button>
      ) 
    }
  ];

  return (
    <DashboardLayout userRole="admin">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: BRAND_COLORS.primary }}>NBE Compliance Reports</Title>
            <Text type="secondary">National Bank of Ethiopia compliance reporting dashboard</Text>
          </div>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        {/* Global Toolbar Filters */}
        <Card style={{ marginBottom: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>Search Report</Text>
              <Input
                className="pill-search-input"
                placeholder="Search Ticket ID or Complainant..."
                prefix={<SearchOutlined style={{ color: '#475569', fontSize: '16px' }} />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>Reporting Month</Text>
              <Select value={annex1Month} onChange={setAnnex1Month} style={{ width: '100%' }}>
                <Option value="ALL">All Months (One Year)</Option>
                {moment.monthsShort().map((m, index) => {
                  const val = String(index + 1).padStart(2, '0');
                  return <Option key={val} value={val}>{m}</Option>;
                })}
              </Select>
            </Col>

            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>Reporting Year</Text>
              <Select value={annex1Year} onChange={setAnnex1Year} style={{ width: '100%' }}>
                {['2024', '2025', '2026', '2027'].map(y => (
                  <Option key={y} value={y}>{y}</Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Tabs for Annex 1 and Annex 2 */}
        <Tabs type="card" defaultActiveKey="annex1" style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          
          {/* ANNEX 1 TAB */}
          <Tabs.TabPane tab="Annex 1 - Monthly Report" key="annex1">
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<FileExcelOutlined />} 
                onClick={() => handleExportExcel('annex1', `NBE_Annex1_${annex1Year}_${annex1Month}`)}
                style={{ background: '#1d7044', borderColor: '#1d7044' }}
              >
                Export Excel
              </Button>
              <Button 
                type="primary" 
                icon={<PrinterOutlined />} 
                onClick={() => handlePrint('annex1')}
              >
                Print / Save to PDF
              </Button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" /></div>
            ) : (
              <div id="nbe-annex1-report" style={{ padding: '10px', backgroundColor: '#fff' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold', color: '#012169' }}>Annex 1 – Complaints Handling Report</h2>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>Dashen Bank S.C.</h3>
                  <h4 style={{ margin: '0', fontSize: '14px', fontWeight: 500 }}>
                    For: <span style={{ borderBottom: '1px solid #000', padding: '0 12px', fontWeight: 'bold' }}>
                      {annex1Month === 'ALL' ? `Full Year ${annex1Year}` : moment(`${annex1Year}-${annex1Month}-01`).format('MMMM, YYYY')}
                    </span>
                  </h4>
                </div>

                <Table
                  id="nbe-annex1-table"
                  columns={columnsAnnex1}
                  dataSource={filteredAnnex1}
                  rowKey="processInstanceId"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 25, 50, 100],
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`
                  }}
                  bordered
                  scroll={{ x: 'max-content' }}
                />
              </div>
            )}
          </Tabs.TabPane>

          {/* ANNEX 2 TAB */}
          <Tabs.TabPane tab="Annex 2 - Unresolved Escalations" key="annex2">
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<FileExcelOutlined />} 
                onClick={() => handleExportExcel('annex2', 'NBE_Annex2_Escalations')}
                style={{ background: '#1d7044', borderColor: '#1d7044' }}
              >
                Export Excel
              </Button>
              <Button 
                type="primary" 
                icon={<PrinterOutlined />} 
                onClick={() => handlePrint('annex2')}
              >
                Print / Save to PDF
              </Button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" /></div>
            ) : (
              <div id="nbe-annex2-report" style={{ padding: '10px', backgroundColor: '#fff' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold', color: '#012169' }}>Annex 2 – Notification Letter to NBE</h2>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: 'bold', color: '#555' }}>For Complaints Not Resolved Within 10 Business Days</h3>
                  <h4 style={{ margin: '0', fontSize: '13px', fontWeight: 400 }}>Reporting Entity: Dashen Bank S.C.</h4>
                </div>

                <Table
                  id="nbe-annex2-table"
                  columns={columnsAnnex2}
                  dataSource={filteredAnnex2}
                  rowKey="processInstanceId"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 25, 50, 100],
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`
                  }}
                  bordered
                  scroll={{ x: 'max-content' }}
                />
              </div>
            )}
          </Tabs.TabPane>
        </Tabs>

        {/* Modal for editing Reason for Non-Resolution & Comments */}
        <Modal
          title={<span style={{ color: BRAND_COLORS.primary, fontWeight: 'bold' }}>Edit NBE Comments</span>}
          open={isEditModalOpen}
          onOk={handleSaveComments}
          onCancel={() => setIsEditModalOpen(false)}
          okText="Save Comments"
          confirmLoading={savingComments}
          destroyOnClose
        >
          <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
            <Form.Item 
              name="reasonForNonResolution" 
              label="Reason for Non-Resolution"
              rules={[{ required: true, message: 'Please provide the reason for non-resolution.' }]}
            >
              <Input.TextArea rows={4} placeholder="Describe the reason why this complaint could not be resolved within 10 business days..." />
            </Form.Item>
            <Form.Item 
              name="additionalComments" 
              label="Additional Comments / Action Plan"
            >
              <Input.TextArea rows={3} placeholder="Provide any additional comments, mitigations, or next steps..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default NBEReports;
