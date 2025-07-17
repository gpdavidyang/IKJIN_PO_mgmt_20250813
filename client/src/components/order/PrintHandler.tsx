import { getPrintStyles } from "@/styles/print-styles";

interface PrintHandlerProps {
  poNumber: string;
  contentElementId: string;
}

export function handlePrint({ poNumber, contentElementId }: PrintHandlerProps) {
  const printContent = document.getElementById(contentElementId);
  if (!printContent) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>발주서 인쇄 - ${poNumber}</title>
        <style>
          ${getPrintStyles()}
        </style>
      </head>
      <body>
        <div class="print-container">
          ${printContent.innerHTML}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}