import ApiService from './services/api';

// Test function to verify API connection
export const testConnection = async () => {
  try {
    console.log('Testing API connection...');
    
    // Test 1: Get tasks
    const tasks = await ApiService.getTasks();
    console.log('✅ Tasks API working:', tasks);
    
    // Test 2: Submit complaint
    const testComplaint = {
      customer: {
        name: "Test User",
        email: "test@example.com",
        phone: "+251912345678",
        accountNumber: "123456789"
      },
      complaint: {
        channel: "web",
        description: "Test complaint from frontend"
      }
    };
    
    const response = await ApiService.submitComplaint(testComplaint);
    console.log('✅ Complaint submission working:', response);
    
    return true;
  } catch (error) {
    console.error('❌ API connection failed:', error);
    return false;
  }
};

export default testConnection;
