import React, { useState, useRef } from "react";
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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesChange([...uploadedFiles, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      onFilesChange([...uploadedFiles, ...newFiles]);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };
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
          <Label className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            첨부파일
          </Label>
          
          {/* 드래그앤드랍 영역 */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
          >
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              파일을 선택하거나 여기에 드래그하세요
            </p>
            <p className="text-xs text-gray-500">
              모든 파일 형식 지원
            </p>
            
            {/* 숨겨진 파일 input */}
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="*"
            />
          </div>
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

        {uploadedFiles.length > 0 && (
          <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              ✅ {uploadedFiles.length}개의 파일이 첨부되었습니다.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}