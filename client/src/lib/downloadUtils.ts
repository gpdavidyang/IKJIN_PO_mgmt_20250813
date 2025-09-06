/**
 * Utility functions for reliable file downloads
 */

/**
 * Reliable download function - simplest approach that works
 * @param attachmentId - The ID of the attachment to download  
 * @param filename - The filename for the download
 * @returns Promise<boolean> - true if download was successful
 */
export const downloadAttachment = async (attachmentId: number, filename: string): Promise<boolean> => {
  console.log(`🔽 Starting download for attachment ${attachmentId}, filename: ${filename}`);
  
  try {
    // Build the download URL with forced download parameter
    const baseUrl = window.location.origin;
    const downloadUrl = `${baseUrl}/api/attachments/${attachmentId}/download?download=true`;
    
    console.log('📎 Full download URL:', downloadUrl);
    
    // Create a temporary anchor element for download
    // This is more reliable than window.location for forced downloads
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename; // Suggest filename to browser
    link.style.display = 'none';
    
    // Add to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Download triggered via anchor element');
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
 */
export const showDownloadSuccessMessage = (filename: string, toast: any) => {
  toast({
    title: "다운로드 완료",
    description: `${filename} 파일이 다운로드 폴더에 저장되었습니다.`,
  });
};