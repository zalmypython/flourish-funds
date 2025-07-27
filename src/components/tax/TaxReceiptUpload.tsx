import { useState, useCallback } from 'react';
import { Upload, X, FileText, Image, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TaxDocument {
  id: string;
  documentType: 'receipt' | 'w2' | '1099' | 'bank_statement' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
  description: string;
}

interface TaxReceiptUploadProps {
  taxFormId: string;
  onDocumentUploaded: (document: TaxDocument) => void;
  onDocumentDeleted: (documentId: string) => void;
  documents: TaxDocument[];
  className?: string;
}

export function TaxReceiptUpload({ 
  taxFormId, 
  onDocumentUploaded, 
  onDocumentDeleted,
  documents = [],
  className 
}: TaxReceiptUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState<string>('receipt');
  const [description, setDescription] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only JPG, PNG, HEIC, or PDF files');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);
      formData.append('description', description);

      const response = await fetch(`/api/tax-forms/${taxFormId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const uploadedDocument = await response.json();
      onDocumentUploaded(uploadedDocument);
      setDescription('');
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/tax-forms/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      onDocumentDeleted(documentId);
      toast.success('Receipt deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete receipt');
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'heic'].includes(extension || '')) {
      return <Image className="h-4 w-4" />;
    }
    if (extension === 'pdf') {
      return <FileText className="h-4 w-4" />;
    }
    return <Receipt className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Tax Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">Receipt/Invoice</SelectItem>
                <SelectItem value="w2">W-2 Form</SelectItem>
                <SelectItem value="1099">1099 Form</SelectItem>
                <SelectItem value="bank_statement">Bank Statement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for this document..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/10'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="fileInput"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".jpg,.jpeg,.png,.heic,.pdf"
              onChange={handleFileInput}
              disabled={uploading}
            />
            
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {dragActive ? 'Drop the file here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: JPG, PNG, HEIC, PDF (max 10MB)
                </p>
              </div>
            </div>

            {uploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Uploading...</span>
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Documents */}
          {documents.length > 0 && (
            <div className="space-y-3">
              <Label>Uploaded Documents</Label>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.fileName)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{doc.fileName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {doc.documentType}
                          </Badge>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}