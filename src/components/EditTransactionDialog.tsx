import React, { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Transaction, TransactionDocument, DEFAULT_CATEGORIES } from '@/types';
import { logger } from '@/utils/logger';
import { DocumentUploadArea } from './DocumentUploadArea';
import {
  Camera,
  Upload,
  FileText,
  X,
  Eye,
  Download,
  Paperclip,
} from 'lucide-react';

const transactionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (transactionId: string, data: Partial<Transaction>) => Promise<void>;
  onUploadDocument: (transactionId: string, file: File, source: 'camera' | 'files' | 'drag-drop') => Promise<TransactionDocument>;
  onDeleteDocument: (transactionId: string, documentId: string) => Promise<void>;
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onUpdate,
  onUploadDocument,
  onDeleteDocument,
}: EditTransactionDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<TransactionDocument[]>(transaction?.documents || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { handleError, executeWithErrorHandling } = useErrorHandler('EditTransactionDialog');

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: transaction?.description || '',
      amount: transaction?.amount || 0,
      category: transaction?.category || '',
      date: transaction?.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : '',
      notes: transaction?.notes || '',
    },
  });

  const handleFileUpload = useCallback(async (files: FileList, source: 'camera' | 'files' | 'drag-drop') => {
    if (!transaction) {
      logger.warn('File upload attempted without transaction context');
      return;
    }

    setIsUploading(true);
    
    const result = await executeWithErrorHandling(async () => {
      logger.info('Starting file upload', {
        transactionId: transaction.id,
        fileCount: files.length,
        source,
        files: Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }))
      });

      const uploadPromises = Array.from(files).map(file => 
        onUploadDocument(transaction.id, file, source)
      );
      
      const newDocuments = await Promise.all(uploadPromises);
      setDocuments(prev => [...prev, ...newDocuments]);
      
      logger.info('File upload completed successfully', {
        transactionId: transaction.id,
        uploadedCount: newDocuments.length,
        source
      });
      
      toast({
        title: 'Documents uploaded',
        description: `${newDocuments.length} document(s) uploaded successfully`,
      });

      return newDocuments;
    }, { action: 'upload_documents', additionalData: { source } });

    setIsUploading(false);
    return result;
  }, [transaction, onUploadDocument, toast, executeWithErrorHandling]);

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!transaction) {
      logger.warn('Document deletion attempted without transaction context');
      return;
    }

    const result = await executeWithErrorHandling(async () => {
      logger.info('Starting document deletion', {
        transactionId: transaction.id,
        documentId
      });

      await onDeleteDocument(transaction.id, documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      logger.info('Document deleted successfully', {
        transactionId: transaction.id,
        documentId
      });
      
      toast({
        title: 'Document deleted',
        description: 'Document was removed successfully',
      });
    }, { action: 'delete_document', additionalData: { documentId } });

    return result;
  };

  const onSubmit = async (data: TransactionFormData) => {
    if (!transaction) {
      logger.warn('Transaction update attempted without transaction context');
      return;
    }

    const result = await executeWithErrorHandling(async () => {
      logger.info('Starting transaction update', {
        transactionId: transaction.id,
        updateData: { ...data, documentCount: documents.length }
      });

      await onUpdate(transaction.id, {
        ...data,
        documents,
      });
      
      logger.info('Transaction updated successfully', {
        transactionId: transaction.id
      });
      
      toast({
        title: 'Transaction updated',
        description: 'Transaction has been updated successfully',
      });
      
      onOpenChange(false);
    }, { action: 'update_transaction' });

    return result;
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Transaction description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEFAULT_CATEGORIES.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add notes about this transaction..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                <h3 className="text-sm font-medium">Documents & Receipts</h3>
              </div>

              {/* Upload Controls */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCameraCapture}
                  disabled={isUploading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFileSelect}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>

              {/* Hidden File Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'camera')}
              />
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'files')}
              />

              {/* Drag & Drop Area */}
              <DocumentUploadArea
                onFilesDrop={(files) => handleFileUpload(files, 'drag-drop')}
                isUploading={isUploading}
              />

              {/* Document List */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Uploaded Documents</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.originalName}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                                <Badge variant="outline" className="text-xs">
                                  {doc.source}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = doc.url;
                                link.download = doc.originalName;
                                link.click();
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Update Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}