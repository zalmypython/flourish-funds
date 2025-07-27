import { BaseDocument } from './index';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  phoneNumber: string;
  email: string;
  occupation: string;
  spouseInfo?: {
    firstName: string;
    lastName: string;
    ssn: string;
    dateOfBirth: string;
    occupation: string;
  };
  dependents: Dependent[];
}

export interface Dependent {
  id: string;
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  relationship: string;
  monthsLived: number;
  qualifyingChild: boolean;
  qualifyingRelative: boolean;
}

export interface IncomeData {
  w2Income: W2Income[];
  form1099Income: Form1099Income[];
  selfEmploymentIncome: SelfEmploymentIncome[];
  retirementIncome: RetirementIncome[];
  unemploymentCompensation: number;
  socialSecurityBenefits: number;
  otherIncome: OtherIncome[];
}

export interface W2Income {
  id: string;
  employer: string;
  ein: string;
  wages: number;
  federalTaxWithheld: number;
  socialSecurityWages: number;
  socialSecurityTaxWithheld: number;
  medicareWages: number;
  medicareTaxWithheld: number;
  stateTaxWithheld: number;
  stateWages: number;
  state: string;
}

export interface Form1099Income {
  id: string;
  type: '1099-INT' | '1099-DIV' | '1099-NEC' | '1099-MISC' | '1099-G' | '1099-R';
  payer: string;
  ein: string;
  amount: number;
  federalTaxWithheld: number;
  stateTaxWithheld: number;
  description: string;
}

export interface SelfEmploymentIncome {
  id: string;
  businessName: string;
  ein?: string;
  businessType: string;
  grossReceipts: number;
  businessExpenses: BusinessExpense[];
  netProfit: number;
}

export interface BusinessExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  dateIncurred: string;
}

export interface RetirementIncome {
  id: string;
  source: string;
  type: '401k' | '403b' | 'IRA' | 'Pension' | 'Annuity';
  grossDistribution: number;
  taxableAmount: number;
  federalTaxWithheld: number;
  stateTaxWithheld: number;
}

export interface OtherIncome {
  id: string;
  source: string;
  type: string;
  amount: number;
  taxable: boolean;
}

export interface DeductionsData {
  deductionType: 'standard' | 'itemized';
  itemizedDeductions?: ItemizedDeductions;
  adjustments: Adjustments;
}

export interface ItemizedDeductions {
  medicalExpenses: number;
  stateAndLocalTaxes: number;
  mortgageInterest: number;
  charitableContributions: CharitableContribution[];
  miscellaneousDeductions: number;
}

export interface CharitableContribution {
  id: string;
  organization: string;
  amount: number;
  type: 'cash' | 'property';
  dateOfContribution: string;
  receiptIds?: string[]; // Array of tax document IDs for receipts
}

export interface Adjustments {
  educatorExpenses: number;
  hsa_contributions: number;
  movingExpenses: number;
  selfEmploymentTax: number;
  studentLoanInterest: number;
  tuitionAndFees: number;
}

export interface CreditsData {
  childTaxCredit: ChildTaxCredit;
  earnedIncomeCredit: EarnedIncomeCredit;
  educationCredits: EducationCredit[];
  childAndDependentCareCredit: ChildAndDependentCareCredit;
  otherCredits: OtherCredit[];
}

export interface ChildTaxCredit {
  qualifyingChildren: string[]; // Array of dependent IDs
  creditAmount: number;
}

export interface EarnedIncomeCredit {
  qualifyingChildren: number;
  filingStatus: string;
  agi: number;
  creditAmount: number;
}

export interface EducationCredit {
  id: string;
  type: 'american_opportunity' | 'lifetime_learning';
  studentName: string;
  institution: string;
  tuitionPaid: number;
  creditAmount: number;
}

export interface ChildAndDependentCareCredit {
  qualifyingPersons: string[]; // Array of dependent IDs
  careExpenses: number;
  creditAmount: number;
}

export interface OtherCredit {
  id: string;
  type: string;
  description: string;
  amount: number;
}

export interface TaxFormData extends BaseDocument {
  taxYear: number;
  filingStatus: 'single' | 'married_jointly' | 'married_separately' | 'head_of_household' | 'qualifying_widow';
  personalInfo: PersonalInfo;
  incomeData: IncomeData;
  deductionsData: DeductionsData;
  creditsData: CreditsData;
  status: 'draft' | 'completed' | 'submitted_to_accountant' | 'reviewed' | 'filed';
  lastModified: string;
  estimatedTax?: {
    totalTax: number;
    taxLiability: number;
    refundAmount: number;
    effectiveTaxRate: number;
  };
}

export interface TaxDocument extends BaseDocument {
  taxFormId: string;
  documentType: 'w2' | '1099' | 'receipt' | 'bank_statement' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
  description: string;
}

export interface AccountantClientAccess extends BaseDocument {
  accountantId: string;
  clientId: string;
  accessLevel: 'view_only' | 'edit_forms' | 'full_access';
  accessGranted: string;
  accessExpires: string;
  taxYears: number[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  clientApprovalDate?: string;
  notes?: string;
}

export interface AccountantNote extends BaseDocument {
  taxFormId: string;
  accountantId: string;
  clientId: string;
  noteText: string;
  category: 'question' | 'recommendation' | 'concern' | 'completion';
  resolved: boolean;
  createdDate: string;
}

export interface TaxFormHistory extends BaseDocument {
  taxFormId: string;
  changeDescription: string;
  changedBy: string; // userId or accountantId
  changeDate: string;
  previousData: Partial<TaxFormData>;
  newData: Partial<TaxFormData>;
}