export const getPrintStyles = () => `
  @page {
    margin: 10mm;
    size: A4;
  }
  
  body {
    margin: 0;
    font-family: 'Malgun Gothic', sans-serif;
    font-size: 9px;
    line-height: 1.2;
    color: #000;
    background: white;
  }
  
  .print-container {
    width: 180mm;
    margin: 0 auto;
    background: white;
    padding: 10mm;
  }
  
  /* Typography */
  h1 { font-size: 18px; font-weight: bold; margin: 0 0 16px 0; }
  h4 { font-size: 9px; font-weight: bold; margin: 8px 0 4px 0; padding: 2px 8px; background-color: #f9fafb; }
  
  /* Layout */
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .gap-6 { gap: 1.5rem; }
  .space-y-1 > * + * { margin-top: 0.25rem; }
  .space-y-2 > * + * { margin-top: 0.5rem; }
  
  /* Spacing */
  .mb-2 { margin-bottom: 0.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
  .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
  .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
  
  /* Text */
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-bold { font-weight: bold; }
  .text-blue-600 { color: #2563eb; }
  .text-gray-800 { color: #1f2937; }
  .text-gray-900 { color: #111827; }
  .text-xs { font-size: 9px; }
  .text-sm { font-size: 10px; }
  
  /* Colors */
  .bg-gray-50 { background-color: #f9fafb; }
  
  /* Borders */
  .border-l-3 { border-left: 3px solid; }
  .border-blue-500 { border-left-color: #3b82f6; }
  .border-green-500 { border-left-color: #10b981; }
  .border-r { border-right: 1px solid #d1d5db; }
  .border-gray-300 { border-color: #d1d5db; }
  .border-b { border-bottom: 1px solid #e5e7eb; }
  .border-gray-200 { border-color: #e5e7eb; }
  
  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
  }
  th, td {
    border: 1px solid #d1d5db;
    padding: 2px 4px;
    text-align: left;
    font-size: 9px;
  }
  th {
    background-color: #f9fafb;
    font-weight: bold;
  }
  
  /* Approval boxes */
  .approval-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    margin-bottom: 16px;
    margin-top: 8px;
  }
  .approval-box {
    border: 1px solid #333;
    height: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2px;
  }
  .approval-title {
    font-size: 8px;
    font-weight: bold;
    margin-bottom: 2px;
    line-height: 1;
  }
  
  /* Width utilities */
  .w-18 { width: 4.5rem; }
  
  /* Company info section */
  .company-footer {
    border-top: 2px solid #333;
    margin-top: 24px;
    padding-top: 8px;
    text-align: center;
  }
  
  /* Summary section */
  .summary-section {
    margin: 16px 0;
  }
  
  /* Hide print-only elements */
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
  }
`;