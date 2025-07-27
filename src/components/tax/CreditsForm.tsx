import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditsData, Dependent, EducationCredit } from "@/types/tax";
import { Plus, Trash2, Award } from "lucide-react";

interface CreditsFormProps {
  data?: CreditsData;
  dependents: Dependent[];
  onUpdate: (data: CreditsData) => void;
}

export function CreditsForm({ data, dependents, onUpdate }: CreditsFormProps) {
  const [creditsData, setCreditsData] = useState<CreditsData>(data || {
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
  });

  const updateData = (newData: Partial<CreditsData>) => {
    const updated = { ...creditsData, ...newData };
    setCreditsData(updated);
    onUpdate(updated);
  };

  const addEducationCredit = () => {
    const newCredit: EducationCredit = {
      id: Date.now().toString(),
      type: 'american_opportunity',
      studentName: '',
      institution: '',
      tuitionPaid: 0,
      creditAmount: 0
    };
    updateData({ 
      educationCredits: [...creditsData.educationCredits, newCredit] 
    });
  };

  const removeEducationCredit = (id: string) => {
    updateData({ 
      educationCredits: creditsData.educationCredits.filter(c => c.id !== id) 
    });
  };

  const updateEducationCredit = (id: string, field: keyof EducationCredit, value: string | number) => {
    const updated = creditsData.educationCredits.map(credit => 
      credit.id === id ? { ...credit, [field]: value } : credit
    );
    updateData({ educationCredits: updated });
  };

  const handleChildTaxCreditChange = (dependentId: string, checked: boolean) => {
    const currentQualifying = creditsData.childTaxCredit.qualifyingChildren;
    const updated = checked 
      ? [...currentQualifying, dependentId]
      : currentQualifying.filter(id => id !== dependentId);
    
    updateData({
      childTaxCredit: {
        ...creditsData.childTaxCredit,
        qualifyingChildren: updated,
        creditAmount: updated.length * 2000 // $2,000 per qualifying child
      }
    });
  };

  const handleDependentCareChange = (dependentId: string, checked: boolean) => {
    const currentQualifying = creditsData.childAndDependentCareCredit.qualifyingPersons;
    const updated = checked 
      ? [...currentQualifying, dependentId]
      : currentQualifying.filter(id => id !== dependentId);
    
    updateData({
      childAndDependentCareCredit: {
        ...creditsData.childAndDependentCareCredit,
        qualifyingPersons: updated
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Tax Credits
          </CardTitle>
          <CardDescription>
            Credits reduce your tax liability dollar-for-dollar
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Child Tax Credit */}
      <Card>
        <CardHeader>
          <CardTitle>Child Tax Credit</CardTitle>
          <CardDescription>
            Up to $2,000 per qualifying child under 17
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dependents.length > 0 ? (
            <div className="space-y-3">
              {dependents.map((dependent) => (
                <div key={dependent.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{dependent.firstName} {dependent.lastName}</div>
                    <div className="text-sm text-muted-foreground">
                      Born: {dependent.dateOfBirth} • {dependent.relationship}
                    </div>
                  </div>
                  <Checkbox
                    checked={creditsData.childTaxCredit.qualifyingChildren.includes(dependent.id)}
                    onCheckedChange={(checked) => handleChildTaxCreditChange(dependent.id, checked as boolean)}
                  />
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Estimated Credit: ${creditsData.childTaxCredit.creditAmount.toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No dependents added. Add dependents in the Personal Info section to claim this credit.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Education Credits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Education Credits</CardTitle>
              <CardDescription>American Opportunity and Lifetime Learning credits</CardDescription>
            </div>
            <Button onClick={addEducationCredit} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {creditsData.educationCredits.map((credit) => (
              <div key={credit.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">
                    {credit.studentName || 'New Student'}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEducationCredit(credit.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Student Name</Label>
                    <Input
                      value={credit.studentName}
                      onChange={(e) => updateEducationCredit(credit.id, 'studentName', e.target.value)}
                      placeholder="Student's full name"
                    />
                  </div>
                  <div>
                    <Label>Credit Type</Label>
                    <Select
                      value={credit.type}
                      onValueChange={(value) => updateEducationCredit(credit.id, 'type', value as EducationCredit['type'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="american_opportunity">American Opportunity Credit</SelectItem>
                        <SelectItem value="lifetime_learning">Lifetime Learning Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Educational Institution</Label>
                    <Input
                      value={credit.institution}
                      onChange={(e) => updateEducationCredit(credit.id, 'institution', e.target.value)}
                      placeholder="School/University name"
                    />
                  </div>
                  <div>
                    <Label>Tuition Paid</Label>
                    <Input
                      type="number"
                      value={credit.tuitionPaid}
                      onChange={(e) => updateEducationCredit(credit.id, 'tuitionPaid', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            {creditsData.educationCredits.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No education credits added. Click "Add Student" to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Child and Dependent Care Credit */}
      <Card>
        <CardHeader>
          <CardTitle>Child and Dependent Care Credit</CardTitle>
          <CardDescription>
            Credit for expenses paid for care while you work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dependents.length > 0 ? (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Qualifying Persons</Label>
                <div className="space-y-3 mt-2">
                  {dependents.map((dependent) => (
                    <div key={dependent.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{dependent.firstName} {dependent.lastName}</div>
                        <div className="text-sm text-muted-foreground">
                          Born: {dependent.dateOfBirth} • {dependent.relationship}
                        </div>
                      </div>
                      <Checkbox
                        checked={creditsData.childAndDependentCareCredit.qualifyingPersons.includes(dependent.id)}
                        onCheckedChange={(checked) => handleDependentCareChange(dependent.id, checked as boolean)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Total Care Expenses</Label>
                <Input
                  type="number"
                  value={creditsData.childAndDependentCareCredit.careExpenses}
                  onChange={(e) => updateData({
                    childAndDependentCareCredit: {
                      ...creditsData.childAndDependentCareCredit,
                      careExpenses: parseFloat(e.target.value) || 0
                    }
                  })}
                  placeholder="0.00"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No dependents added. Add dependents in the Personal Info section to claim this credit.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earned Income Credit */}
      <Card>
        <CardHeader>
          <CardTitle>Earned Income Tax Credit (EITC)</CardTitle>
          <CardDescription>
            Credit for low to moderate income working individuals and families
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Number of Qualifying Children</Label>
              <Select
                value={creditsData.earnedIncomeCredit.qualifyingChildren.toString()}
                onValueChange={(value) => updateData({
                  earnedIncomeCredit: {
                    ...creditsData.earnedIncomeCredit,
                    qualifyingChildren: parseInt(value)
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3 or more</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Adjusted Gross Income</Label>
              <Input
                type="number"
                value={creditsData.earnedIncomeCredit.agi}
                onChange={(e) => updateData({
                  earnedIncomeCredit: {
                    ...creditsData.earnedIncomeCredit,
                    agi: parseFloat(e.target.value) || 0
                  }
                })}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">
              The EITC amount will be calculated based on your income, filing status, and number of qualifying children.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}