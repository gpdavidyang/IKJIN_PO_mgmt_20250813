const fetch = require('node-fetch');

async function testProjectCreation() {
  try {
    const testData = {
      projectName: "테스트 현장",
      projectCode: "TEST001",
      clientName: "테스트 고객사",
      projectType: "아파트",
      location: "서울시 강남구",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      description: "테스트 프로젝트",
      totalBudget: 1000000,
      projectManagerId: "test_admin_001"
    };
    
    console.log('🚀 Testing project creation with data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AIh1t0xUcf6SXsBS3dvvTCOBVNWqx5jUq.ZhD%2FT6y6jl4t%2FnEJl2cZvCw8W%2BH1Nzf0Pw2S4dY'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.text();
    console.log('📄 Response status:', response.status);
    console.log('📄 Response body:', result);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testProjectCreation();