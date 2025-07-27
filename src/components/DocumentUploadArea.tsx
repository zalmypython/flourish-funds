import React, { useCallback, useState } from 'react';
import { Upload, FileImage, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DocumentUploadAreaProps {
  onFilesDrop: (files: FileList) => void;
  isUploading: boolean;
  maxFiles?: number;
  maxSizeInMB?: number;
  acceptedTypes?: string[];
}

export function DocumentUploadArea({
  onFilesDrop,
  isUploading,
  maxFiles = 10,
  maxSizeInMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'],
}: DocumentUploadAreaProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  const validateFiles = useCallback((files: FileList): { valid: FileList; errors: string[] } => {
    const errors: string[] = [];
    const validFiles: File[] = [];

    Array.from(files).forEach((file) => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }

      // Check file size
      if (file.size > maxSizeInMB * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max ${maxSizeInMB}MB)`);
        return;
      }

      validFiles.push(file);
    });

    // Check max files limit
    if (validFiles.length > maxFiles) {
      errors.push(`Too many files (max ${maxFiles} allowed)`);
      return { valid: new DataTransfer().files, errors };
    }

    const dataTransfer = new DataTransfer();
    validFiles.forEach(file => dataTransfer.items.add(file));

    return { valid: dataTransfer.files, errors };
  }, [acceptedTypes, maxFiles, maxSizeInMB]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
    setDragError(null);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drag inactive if we're leaving the drag area itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    
    setIsDragActive(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      setDragError(errors.join('; '));
      return;
    }

    if (valid.length > 0) {
      onFilesDrop(valid);
    }
  }, [validateFiles, onFilesDrop]);

  const formatAcceptedTypes = () => {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'JPG',
      'image/png': 'PNG', 
      'image/heic': 'HEIC',
      'application/pdf': 'PDF',
    };
    
    return acceptedTypes.map(type => typeMap[type] || type.split('/')[1].toUpperCase()).join(', ');
  };

  return (
    <Card
      className={`
        relative border-2 border-dashed transition-all duration-200 ease-in-out
        ${isDragActive 
          ? 'border-primary bg-primary/5 scale-[1.02]' 
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }
        ${dragError ? 'border-destructive bg-destructive/5' : ''}
        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="p-8 text-center">
        <div className="mx-auto mb-4">
          {isUploading ? (
            <div className="animate-spin">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <FileImage className="h-8 w-8 text-muted-foreground mx-auto" />
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {isUploading 
              ? 'Uploading documents...' 
              : isDragActive 
                ? 'Drop files here'
                : 'Drag and drop files here'
            }
          </p>
          
          {!isUploading && (
            <p className="text-xs text-muted-foreground">
              Supports {formatAcceptedTypes()} • Max {maxSizeInMB}MB per file • Up to {maxFiles} files
            </p>
          )}
        </div>

        {dragError && (
          <div className="mt-4 p-2 bg-destructive/10 border border-destructive/20 rounded">
            <div className="flex items-center justify-between">
              <p className="text-xs text-destructive">{dragError}</p>
              <button
                onClick={() => setDragError(null)}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}