/**
 * Utility functions for reliable file downloads
 */

// Helper function to attempt download using multiple methods for better browser compatibility
export const tryMultipleDownloadMethods = (url: string, filename: string): boolean => {
  try {
    // Method 1: Try using window.open (most reliable for downloads)
    const downloadWindow = window.open(url, '_blank');
    if (downloadWindow) {
      // Close the window after a short delay if it opened successfully
      setTimeout(() => {
        try {
          downloadWindow.close();
        } catch (e) {
          // Ignore errors when closing - the download should have started
        }
      }, 1000);
      return true;
    }
    
    // Method 2: Fallback to hidden iframe approach
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    
    // Remove iframe after download starts
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (e) {
        // Ignore removal errors
      }
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('All download methods failed:', error);
    
    // Method 3: Last resort - direct navigation
    try {
      window.location.href = url;
      return true;
    } catch (finalError) {
      console.error('Final download method failed:', finalError);
      return false;
    }
  }
};

/**
 * Reliable download function that verifies file exists before attempting download
 * @param attachmentId - The ID of the attachment to download
 * @param filename - The filename for the download
 * @returns Promise<boolean> - true if download was attempted successfully
 */
export const downloadAttachment = async (attachmentId: number, filename: string): Promise<boolean> => {
  try {
    // First verify the file exists by making a HEAD request
    const verifyResponse = await fetch(`/api/attachments/${attachmentId}/download`, {
      method: 'HEAD',
      credentials: 'include', // This will automatically include cookies
    });
    
    if (!verifyResponse.ok) {
      throw new Error('파일을 찾을 수 없습니다');
    }
    
    // Use direct browser navigation for reliable downloads
    const downloadUrl = `/api/attachments/${attachmentId}/download?download=true`;
    
    // Try multiple download methods for better browser compatibility
    const downloadAttempted = tryMultipleDownloadMethods(downloadUrl, filename);
    
    if (!downloadAttempted) {
      throw new Error('다운로드를 시작할 수 없습니다');
    }
    
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
  // Show success message after a short delay to allow download to start
  setTimeout(() => {
    toast({
      title: "다운로드 시작",
      description: `${filename} 파일 다운로드가 시작되었습니다. 다운로드 폴더를 확인해주세요.`,
    });
  }, 500);
};