export interface TaxFormData {
  id: string;
  userId: string;
  taxYear: number;
  filingStatus: 'single' | 'married_jointly' | 'married_separately' | 'head_of_household' | 'qualifying_widow';
  personalInfo: any;
  incomeData: any;
  deductionsData: any;
  creditsData: any;
  status: 'draft' | 'completed' | 'submitted_to_accountant' | 'reviewed' | 'filed';
  lastModified: string;
  createdAt: string;
  updatedAt: string;
  estimatedTax?: {
    totalTax: number;
    taxLiability: number;
    refundAmount: number;
    effectiveTaxRate: number;
  };
}

export interface TaxDocument {
  id: string;
  userId: string;
  taxFormId: string;
  documentType: 'w2' | '1099' | 'receipt' | 'bank_statement' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountantClientAccess {
  id: string;
  userId: string;
  accountantId: string;
  clientId: string;
  accessLevel: 'view_only' | 'edit_forms' | 'full_access';
  accessGranted: string;
  accessExpires: string;
  taxYears: number[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  clientApprovalDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}