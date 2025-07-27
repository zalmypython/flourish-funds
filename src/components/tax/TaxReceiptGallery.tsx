import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Image, Receipt, Download, Eye, Calendar, DollarSign } from 'lucide-react';
import { TaxReceiptUpload } from './TaxReceiptUpload';

interface TaxDocument {
  id: string;
  documentType: 'receipt' | 'w2' | '1099' | 'bank_statement' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
  description: string;
}

interface TaxReceiptGalleryProps {
  taxFormId: string;
  className?: string;
}

export function TaxReceiptGallery({ taxFormId, className }: TaxReceiptGalleryProps) {
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchDocuments();
  }, [taxFormId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/tax-forms/${taxFormId}/documents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUploaded = (document: TaxDocument) => {
    setDocuments(prev => [...prev, document]);
  };

  const handleDocumentDeleted = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'heic'].includes(extension || '')) {
      return <Image className="h-5 w-5" />;
    }
    if (extension === 'pdf') {
      return <FileText className="h-5 w-5" />;
    }
    return <Receipt className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const documentTypes = [
    { value: 'all', label: 'All Documents' },
    { value: 'receipt', label: 'Receipts' },
    { value: 'w2', label: 'W-2 Forms' },
    { value: '1099', label: '1099 Forms' },
    { value: 'bank_statement', label: 'Bank Statements' },
    { value: 'other', label: 'Other' }
  ];

  const filteredDocuments = selectedType === 'all' 
    ? documents 
    : documents.filter(doc => doc.documentType === selectedType);

  const getDocumentStats = () => {
    const stats = {
      total: documents.length,
      receipts: documents.filter(d => d.documentType === 'receipt').length,
      w2s: documents.filter(d => d.documentType === 'w2').length,
      other: documents.filter(d => !['receipt', 'w2'].includes(d.documentType)).length
    };
    return stats;
  };

  const stats = getDocumentStats();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading documents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Tax Documents & Receipts
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Receipt className="h-4 w-4 mr-2" />
                  Upload New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Tax Document</DialogTitle>
                </DialogHeader>
                <TaxReceiptUpload
                  taxFormId={taxFormId}
                  onDocumentUploaded={handleDocumentUploaded}
                  onDocumentDeleted={handleDocumentDeleted}
                  documents={[]}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Document Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{stats.total} total</span>
            </div>
            <div className="flex items-center gap-1">
              <Receipt className="h-4 w-4" />
              <span>{stats.receipts} receipts</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>{stats.w2s} W-2s</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {documentTypes.map(type => (
              <Button
                key={type.value}
                variant={selectedType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type.value)}
              >
                {type.label}
                {type.value !== 'all' && (
                  <Badge variant="secondary" className="ml-2">
                    {type.value === 'receipt' ? stats.receipts :
                     type.value === 'w2' ? stats.w2s :
                     documents.filter(d => d.documentType === type.value).length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Documents Grid */}
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {selectedType === 'all' ? '' : selectedType} documents uploaded yet</p>
              <p className="text-sm">Upload receipts and tax documents to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((document) => (
                <Card key={document.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      {getFileIcon(document.fileName)}
                      <Badge variant="secondary" className="text-xs">
                        {document.documentType}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm truncate" title={document.fileName}>
                        {document.fileName}
                      </h4>
                      
                      {document.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {document.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(document.uploadDate).toLocaleDateString()}
                        </div>
                        <span>{formatFileSize(document.fileSize)}</span>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="ghost" size="sm" className="h-8 px-2 flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}