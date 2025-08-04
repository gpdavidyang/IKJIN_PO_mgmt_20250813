// Test the transformation logic
const projectTypeMap = {
  "아파트": "residential",
  "오피스텔": "residential", 
  "단독주택": "residential",
  "주거시설": "residential",
  "상업시설": "commercial",
  "사무실": "commercial",
  "쇼핑몰": "commercial",
  "산업시설": "industrial",
  "공장": "industrial",
  "창고": "industrial",
  "인프라": "infrastructure",
  "도로": "infrastructure",
  "교량": "infrastructure",
};

const testData = {
  projectName: '래미안 광교',
  projectCode: '',
  clientName: '삼성건설',
  projectType: '아파트',
  location: '수원시 영통구',
  startDate: '2025-07-01',
  endDate: '2025-07-31',
  totalBudget: '5000000'
};

console.log('Original data:', testData);
console.log('projectType mapping:', projectTypeMap[testData.projectType]);

const transformedData = {
  ...testData,
  startDate: testData.startDate,
  endDate: testData.endDate,
  projectType: projectTypeMap[testData.projectType] || testData.projectType || "commercial",
};

console.log('Transformed data:', transformedData);