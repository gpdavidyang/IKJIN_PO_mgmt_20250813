/**
 * Utility functions for reliable file downloads
 */

/**
 * Reliable download function - simplest approach that works
 * @param attachmentId - The ID of the attachment to download  
 * @param filename - The filename for the download
 * @returns Promise<boolean> - true if download was successful
 */
export const downloadAttachment = async (attachmentId: number, filename: string, mimeType?: string): Promise<boolean> => {
  console.log(`🔽 Starting download for attachment ${attachmentId}, filename: ${filename}, mimeType: ${mimeType}`);
  
  try {
    // Build download URL
    const downloadUrl = `/api/attachments/${attachmentId}/download?download=true`;
    
    console.log('📎 Download URL:', downloadUrl);
    
    // Check if the file is a PDF based on mimeType or filename
    const isPDF = mimeType?.toLowerCase().includes('pdf') || filename.toLowerCase().endsWith('.pdf');
    
    // Use fetch API with credentials for authenticated download
    const response = await fetch(downloadUrl, {
      method: 'GET',
      credentials: 'include', // Important: Include cookies for authentication
      headers: {
        'Accept': isPDF ? 'application/pdf' : '*/*',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Download response error:', errorText);
      throw new Error(`다운로드 실패: ${response.status}`);
    }
    
    // Convert response to blob
    const blob = await response.blob();
    
    // Create blob URL
    const blobUrl = window.URL.createObjectURL(blob);
    
    if (isPDF) {
      // For PDF files: open in new tab AND download
      console.log('📄 File is PDF - opening in new tab and downloading');
      
      // 1. First, open in new tab for viewing
      window.open(blobUrl, '_blank');
      console.log('✅ Opened PDF in new tab for viewing');
      
      // 2. Then trigger download after a short delay
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Cleanup after download
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
        
        console.log('✅ PDF download triggered');
      }, 500); // Small delay to ensure new tab opens first
    } else {
      // For non-PDF files (including Excel): download only
      console.log('📁 File download - triggering download');
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup after download
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
      console.log('✅ File download triggered');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Download error:', error);
    throw error;
  }
};

/**
 * Show appropriate success message after download
 * @param filename - The filename that was downloaded
 * @param toast - Toast function from useToast hook
 * @param mimeType - The MIME type of the file
 */
export const showDownloadSuccessMessage = (filename: string, toast: any, mimeType?: string) => {
  const isPDF = mimeType?.toLowerCase().includes('pdf') || filename.toLowerCase().endsWith('.pdf');
  
  if (isPDF) {
    toast({
      title: "다운로드 및 미리보기",
      description: `${filename} 파일이 새 탭에서 열리고 다운로드 폴더에 저장됩니다.`,
    });
  } else {
    toast({
      title: "다운로드 완료",
      description: `${filename} 파일이 다운로드 폴더에 저장됩니다.`,
    });
  }
};