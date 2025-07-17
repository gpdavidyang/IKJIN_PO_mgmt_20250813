import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Paperclip } from "lucide-react";

interface FileUploadProps {
  uploadedFiles: File[];
  onFilesChange: (files: File[]) => void;
}

export default function FileUpload({ 
  uploadedFiles, 
  onFilesChange 
}: FileUploadProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-blue-600" />
          파일 첨부 및 기타 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="fileUpload" className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            파일 첨부
          </Label>
          <Input
            type="file"
            id="fileUpload"
            multiple
            className="h-10"
            onChange={(e) => {
              if (e.target.files) {
                const newFiles = Array.from(e.target.files);
                onFilesChange([...uploadedFiles, ...newFiles]);
              }
            }}
          />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">첨부된 파일</Label>
            <div className="space-y-1">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{file.name}</span>
                  <button
                    onClick={() => {
                      const newFiles = uploadedFiles.filter((_, i) => i !== index);
                      onFilesChange(newFiles);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-sm font-medium">파일이 성공적으로 업로드되었습니다.</Label>
          <p className="text-sm text-gray-600">
            {uploadedFiles.length > 0 
              ? `${uploadedFiles.length}개의 파일이 첨부되었습니다.`
              : "파일을 선택하여 업로드하세요."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}