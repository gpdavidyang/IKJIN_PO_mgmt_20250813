/**
 * Utility functions for reliable file downloads
 */

/**
 * Reliable download function using fetch with blob
 * @param attachmentId - The ID of the attachment to download
 * @param filename - The filename for the download
 * @returns Promise<boolean> - true if download was successful
 */
export const downloadAttachment = async (attachmentId: number, filename: string): Promise<boolean> => {
  try {
    // Get token from localStorage or cookie for authentication
    const token = localStorage.getItem('token') || document.cookie.match(/auth_token=([^;]+)/)?.[1];
    
    // Fetch the file with authentication
    const response = await fetch(`/api/attachments/${attachmentId}/download?download=true`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include', // Include cookies
    });
    
    if (!response.ok) {
      throw new Error(`다운로드 실패: ${response.status}`);
    }
    
    // Get the blob from response
    const blob = await response.blob();
    
    // Create a blob URL
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Create a temporary anchor element and trigger download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    link.style.display = 'none';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Download error:', error);
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