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
    // Build URLs - one for download, one for viewing
    const baseUrl = window.location.origin;
    const downloadUrl = `${baseUrl}/api/attachments/${attachmentId}/download?download=true`;
    const viewUrl = `${baseUrl}/api/attachments/${attachmentId}/download`; // Without download=true, it will open inline
    
    console.log('📎 Download URL:', downloadUrl);
    console.log('👁️ View URL:', viewUrl);
    
    // 1. First, open in new tab for viewing
    window.open(viewUrl, '_blank');
    console.log('✅ Opened PDF in new tab for viewing');
    
    // 2. Then trigger download after a short delay
    setTimeout(() => {
      // Create a temporary anchor element for download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename; // Suggest filename to browser
      link.style.display = 'none';
      
      // Add to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Download triggered via anchor element');
    }, 500); // Small delay to ensure new tab opens first
    
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
    title: "다운로드 및 미리보기",
    description: `${filename} 파일이 새 탭에서 열리고 다운로드 폴더에 저장됩니다.`,
  });
};