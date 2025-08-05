import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CreationMethod } from '@shared/workflow-types';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Download,
  AlertTriangle 
} from 'lucide-react';
import ExcelUploadComponent from '../excel/ExcelUploadComponent';
import StandardFormComponent from '../standard/StandardFormComponent';

interface CreateStepProps {
  method: CreationMethod;
  onDataSubmit: (data: any) => void;
  disabled?: boolean;
}

const CreateStep: React.FC<CreateStepProps> = ({ method, onDataSubmit, disabled }) => {
  if (method === 'excel') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            엑셀 파일 업로드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExcelUploadComponent 
            onUploadComplete={onDataSubmit}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>표준 발주서 작성</CardTitle>
      </CardHeader>
      <CardContent>
        <StandardFormComponent 
          onFormComplete={onDataSubmit}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
};

export default CreateStep;