import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TaxFormData } from "@/types/tax";
import { CheckCircle, AlertTriangle, DollarSign, FileText, Calculator } from "lucide-react";

interface TaxSummaryProps {
  taxForm: TaxFormData;
  onSubmitToAccountant: () => void;
  onMarkComplete: () => void;
}

export function TaxSummary({ taxForm, onSubmitToAccountant, onMarkComplete }: TaxSummaryProps) {
  // Calculate summary values
  const calculateTotalIncome = () => {
    let total = 0;
    
    // W-2 income
    if (taxForm.incomeData?.w2Income) {
      total += taxForm.incomeData.w2Income.reduce((sum, w2) => sum + w2.wages, 0);
    }
    
    // 1099 income
    if (taxForm.incomeData?.form1099Income) {
      total += taxForm.incomeData.form1099Income.reduce((sum, form) => sum + form.amount, 0);
    }
    
    // Other income
    total += taxForm.incomeData?.unemploymentCompensation || 0;
    total += taxForm.incomeData?.socialSecurityBenefits || 0;
    
    return total;
  };

  const calculateTotalWithholding = () => {
    let total = 0;
    
    // Federal withholding from W-2s
    if (taxForm.incomeData?.w2Income) {
      total += taxForm.incomeData.w2Income.reduce((sum, w2) => sum + w2.federalTaxWithheld, 0);
    }
    
    // Federal withholding from 1099s
    if (taxForm.incomeData?.form1099Income) {
      total += taxForm.incomeData.form1099Income.reduce((sum, form) => sum + form.federalTaxWithheld, 0);
    }
    
    return total;
  };

  const calculateTotalCredits = () => {
    let total = 0;
    
    total += taxForm.creditsData?.childTaxCredit?.creditAmount || 0;
    total += taxForm.creditsData?.earnedIncomeCredit?.creditAmount || 0;
    total += taxForm.creditsData?.childAndDependentCareCredit?.creditAmount || 0;
    
    if (taxForm.creditsData?.educationCredits) {
      total += taxForm.creditsData.educationCredits.reduce((sum, credit) => sum + credit.creditAmount, 0);
    }
    
    return total;
  };

  const getDeductionAmount = () => {
    if (taxForm.deductionsData?.deductionType === 'itemized' && taxForm.deductionsData.itemizedDeductions) {
      const itemized = taxForm.deductionsData.itemizedDeductions;
      return itemized.medicalExpenses + 
             itemized.stateAndLocalTaxes + 
             itemized.mortgageInterest + 
             itemized.miscellaneousDeductions +
             (itemized.charitableContributions?.reduce((sum, c) => sum + c.amount, 0) || 0);
    }
    return 14600; // 2025 standard deduction for single
  };

  const totalIncome = calculateTotalIncome();
  const totalWithholding = calculateTotalWithholding();
  const totalCredits = calculateTotalCredits();
  const deductionAmount = getDeductionAmount();

  // Simple tax calculation (this would be more complex in real implementation)
  const adjustedGrossIncome = totalIncome;
  const taxableIncome = Math.max(0, adjustedGrossIncome - deductionAmount);
  const estimatedTax = taxableIncome * 0.22; // Simplified tax rate
  const finalTax = Math.max(0, estimatedTax - totalCredits);
  const refundOrOwed = totalWithholding - finalTax;

  const getCompletionStatus = () => {
    const checks = [
      { name: "Personal Information", completed: !!taxForm.personalInfo?.firstName && !!taxForm.personalInfo?.lastName },
      { name: "Income Data", completed: !!taxForm.incomeData?.w2Income && taxForm.incomeData.w2Income.length > 0 },
      { name: "Deductions", completed: !!taxForm.deductionsData?.deductionType },
      { name: "Credits", completed: !!taxForm.creditsData }
    ];
    
    const completedCount = checks.filter(check => check.completed).length;
    const isComplete = completedCount === checks.length;
    
    return { checks, completedCount, isComplete };
  };

  const { checks, completedCount, isComplete } = getCompletionStatus();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Return Summary
          </CardTitle>
          <CardDescription>
            Review your tax information before submission
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Completion Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checks.map((check, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{check.name}</span>
                <Badge variant={check.completed ? "default" : "secondary"}>
                  {check.completed ? "Complete" : "Incomplete"}
                </Badge>
              </div>
            ))}
          </div>
          
          {!isComplete && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Complete all sections before submitting to your accountant.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Income</div>
              <div className="text-2xl font-bold">${totalIncome.toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Adjusted Gross Income</div>
              <div className="text-2xl font-bold">${adjustedGrossIncome.toLocaleString()}</div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {taxForm.deductionsData?.deductionType === 'itemized' ? 'Itemized' : 'Standard'} Deductions
              </div>
              <div className="text-lg font-semibold">${deductionAmount.toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Credits</div>
              <div className="text-lg font-semibold">${totalCredits.toLocaleString()}</div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Taxable Income</div>
              <div className="text-lg font-semibold">${taxableIncome.toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Federal Tax Withheld</div>
              <div className="text-lg font-semibold">${totalWithholding.toLocaleString()}</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Estimated Tax Liability</div>
            <div className="text-2xl font-bold">${finalTax.toLocaleString()}</div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {refundOrOwed >= 0 ? 'Estimated Refund' : 'Estimated Amount Owed'}
              </span>
              <span className={`text-xl font-bold ${refundOrOwed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(refundOrOwed).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Income Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxForm.incomeData?.w2Income?.map((w2, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm">{w2.employer} (W-2)</span>
              <span className="font-medium">${w2.wages.toLocaleString()}</span>
            </div>
          ))}
          
          {taxForm.incomeData?.form1099Income?.map((form1099, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm">{form1099.payer} ({form1099.type})</span>
              <span className="font-medium">${form1099.amount.toLocaleString()}</span>
            </div>
          ))}
          
          {(taxForm.incomeData?.unemploymentCompensation || 0) > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Unemployment Compensation</span>
              <span className="font-medium">${taxForm.incomeData!.unemploymentCompensation.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {isComplete && (
          <>
            <Button onClick={onMarkComplete} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Complete
            </Button>
            <Button onClick={onSubmitToAccountant} variant="outline" className="flex-1">
              Submit to Accountant
            </Button>
          </>
        )}
        
        {!isComplete && (
          <Button disabled className="flex-1">
            Complete all sections to submit
          </Button>
        )}
      </div>

      <Alert>
        <Calculator className="h-4 w-4" />
        <AlertDescription>
          This is an estimated calculation. Your actual tax liability may differ based on additional factors not captured in this form. 
          Consult with a tax professional for accurate calculations.
        </AlertDescription>
      </Alert>
    </div>
  );
}
