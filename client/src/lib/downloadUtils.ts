/**
 * Utility functions for reliable file downloads
 */

/**
 * Reliable download function using multiple approaches
 * @param attachmentId - The ID of the attachment to download
 * @param filename - The filename for the download
 * @returns Promise<boolean> - true if download was successful
 */
export const downloadAttachment = async (attachmentId: number, filename: string): Promise<boolean> => {
  console.log(`🔽 Starting download for attachment ${attachmentId}, filename: ${filename}`);
  
  try {
    // Method 1: Try direct window.location with authentication cookie
    // This is the most reliable way for actual file downloads
    const downloadUrl = `/api/attachments/${attachmentId}/download?download=true`;
    
    // First check if file exists
    const token = localStorage.getItem('token') || document.cookie.match(/auth_token=([^;]+)/)?.[1];
    const checkResponse = await fetch(downloadUrl, {
      method: 'HEAD',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });
    
    if (!checkResponse.ok) {
      console.error(`❌ File check failed: ${checkResponse.status}`);
      throw new Error(`파일을 찾을 수 없습니다: ${checkResponse.status}`);
    }
    
    console.log('✅ File exists, attempting download...');
    
    // Method 2: Create hidden form and submit (most compatible)
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = downloadUrl;
    form.style.display = 'none';
    
    // Add auth token as query parameter if available
    if (token) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'token';
      input.value = token;
      form.appendChild(input);
    }
    
    document.body.appendChild(form);
    console.log('📝 Submitting download form...');
    form.submit();
    
    // Clean up form after submission
    setTimeout(() => {
      document.body.removeChild(form);
      console.log('🧹 Cleaned up download form');
    }, 1000);
    
    // Give the download time to start
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Download initiated successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Download error:', error);
    
    // Fallback: Try blob download as last resort
    try {
      console.log('🔄 Trying fallback blob download...');
      const token = localStorage.getItem('token') || document.cookie.match(/auth_token=([^;]+)/)?.[1];
      
      const response = await fetch(`/api/attachments/${attachmentId}/download?download=true`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`다운로드 실패: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log(`📦 Blob received, size: ${blob.size} bytes, type: ${blob.type}`);
      
      // Try using FileSaver.js approach
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      a.setAttribute('download', filename); // Force download attribute
      
      document.body.appendChild(a);
      
      // Try multiple click methods
      if (typeof a.click === 'function') {
        a.click();
      } else {
        const evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);
        a.dispatchEvent(evt);
      }
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('🧹 Cleaned up blob download');
      }, 100);
      
      console.log('✅ Blob download completed');
      return true;
    } catch (fallbackError) {
      console.error('❌ Fallback download also failed:', fallbackError);
      throw error; // Throw original error
    }
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