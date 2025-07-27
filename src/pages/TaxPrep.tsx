import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calculator, DollarSign, Award, Users, CheckCircle } from "lucide-react";
import { PersonalInfoForm } from "@/components/tax/PersonalInfoForm";
import { IncomeDataForm } from "@/components/tax/IncomeDataForm";
import { DeductionsForm } from "@/components/tax/DeductionsForm";
import { CreditsForm } from "@/components/tax/CreditsForm";
import { TaxSummary } from "@/components/tax/TaxSummary";
import { TaxFormData } from "@/types/tax";

const currentTaxYear = 2025;

export default function TaxPrep() {
  const [activeTab, setActiveTab] = useState("personal");
  const [formProgress, setFormProgress] = useState(0);
  const { toast } = useToast();

  // Mock data for demonstration
  const [taxForm, setTaxForm] = useState<Partial<TaxFormData>>({
    taxYear: currentTaxYear,
    filingStatus: 'single',
    status: 'draft',
    personalInfo: {
      firstName: '',
      lastName: '',
      ssn: '',
      dateOfBirth: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      phoneNumber: '',
      email: '',
      occupation: '',
      dependents: []
    },
    incomeData: {
      w2Income: [],
      form1099Income: [],
      selfEmploymentIncome: [],
      retirementIncome: [],
      unemploymentCompensation: 0,
      socialSecurityBenefits: 0,
      otherIncome: []
    },
    deductionsData: {
      deductionType: 'standard',
      adjustments: {
        educatorExpenses: 0,
        hsa_contributions: 0,
        movingExpenses: 0,
        selfEmploymentTax: 0,
        studentLoanInterest: 0,
        tuitionAndFees: 0
      }
    },
    creditsData: {
      childTaxCredit: {
        qualifyingChildren: [],
        creditAmount: 0
      },
      earnedIncomeCredit: {
        qualifyingChildren: 0,
        filingStatus: 'single',
        agi: 0,
        creditAmount: 0
      },
      educationCredits: [],
      childAndDependentCareCredit: {
        qualifyingPersons: [],
        careExpenses: 0,
        creditAmount: 0
      },
      otherCredits: []
    }
  });

  const calculateProgress = () => {
    let completed = 0;
    const sections = 5; // personal, income, deductions, credits, review

    if (taxForm.personalInfo?.firstName && taxForm.personalInfo?.lastName) completed++;
    if (taxForm.incomeData?.w2Income && taxForm.incomeData.w2Income.length > 0) completed++;
    if (taxForm.deductionsData?.deductionType) completed++;
    if (taxForm.creditsData) completed++;
    if (taxForm.status === 'completed') completed++;

    return (completed / sections) * 100;
  };

  const getStatusBadge = () => {
    const status = taxForm.status || 'draft';
    const variants = {
      draft: { variant: "secondary" as const, text: "Draft" },
      completed: { variant: "default" as const, text: "Completed" },
      submitted_to_accountant: { variant: "outline" as const, text: "Submitted to Accountant" },
      reviewed: { variant: "default" as const, text: "Reviewed" },
      filed: { variant: "default" as const, text: "Filed" }
    };
    
    const { variant, text } = variants[status] || variants.draft;
    return <Badge variant={variant}>{text}</Badge>;
  };

  const handleSave = async () => {
    try {
      // Here you would save to the backend
      toast({
        title: "Tax form saved",
        description: "Your tax information has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save tax form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitToAccountant = async () => {
    try {
      // Here you would submit to accountant
      setTaxForm(prev => ({ ...prev, status: 'submitted_to_accountant' }));
      toast({
        title: "Submitted to accountant",
        description: "Your tax form has been submitted for professional review.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit to accountant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const tabsConfig = [
    { value: "personal", label: "Personal Info", icon: Users },
    { value: "income", label: "Income", icon: DollarSign },
    { value: "deductions", label: "Deductions", icon: Calculator },
    { value: "credits", label: "Credits", icon: Award },
    { value: "review", label: "Review", icon: CheckCircle }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Preparation {currentTaxYear}</h1>
          <p className="text-muted-foreground">
            Organize your tax information for filing or professional review
          </p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge()}
          <Button onClick={handleSave} variant="outline">
            Save Draft
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Progress Overview
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {Math.round(calculateProgress())}% Complete
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={calculateProgress()} className="h-2" />
          <div className="mt-2 text-sm text-muted-foreground">
            Complete all sections to submit for professional review
          </div>
        </CardContent>
      </Card>

      {/* Tax Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoForm 
            data={taxForm.personalInfo}
            filingStatus={taxForm.filingStatus}
            onUpdate={(data) => setTaxForm(prev => ({ 
              ...prev, 
              personalInfo: data.personalInfo,
              filingStatus: data.filingStatus as TaxFormData['filingStatus']
            }))}
          />
        </TabsContent>

        <TabsContent value="income">
          <IncomeDataForm 
            data={taxForm.incomeData}
            onUpdate={(incomeData) => setTaxForm(prev => ({ ...prev, incomeData }))}
          />
        </TabsContent>

        <TabsContent value="deductions">
          <DeductionsForm 
            data={taxForm.deductionsData}
            onUpdate={(deductionsData) => setTaxForm(prev => ({ ...prev, deductionsData }))}
          />
        </TabsContent>

        <TabsContent value="credits">
          <CreditsForm 
            data={taxForm.creditsData}
            dependents={taxForm.personalInfo?.dependents || []}
            onUpdate={(creditsData) => setTaxForm(prev => ({ ...prev, creditsData }))}
          />
        </TabsContent>

        <TabsContent value="review">
          <TaxSummary 
            taxForm={taxForm as TaxFormData}
            onSubmitToAccountant={handleSubmitToAccountant}
            onMarkComplete={() => setTaxForm(prev => ({ ...prev, status: 'completed' }))}
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            const currentIndex = tabsConfig.findIndex(tab => tab.value === activeTab);
            if (currentIndex > 0) {
              setActiveTab(tabsConfig[currentIndex - 1].value);
            }
          }}
          disabled={activeTab === "personal"}
        >
          Previous
        </Button>
        
        <Button 
          onClick={() => {
            const currentIndex = tabsConfig.findIndex(tab => tab.value === activeTab);
            if (currentIndex < tabsConfig.length - 1) {
              setActiveTab(tabsConfig[currentIndex + 1].value);
            }
          }}
          disabled={activeTab === "review"}
        >
          Next
        </Button>
      </div>
    </div>
  );
}