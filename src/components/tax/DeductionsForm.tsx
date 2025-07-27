import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeductionsData, CharitableContribution } from "@/types/tax";
import { Plus, Trash2, Calculator } from "lucide-react";

interface DeductionsFormProps {
  data?: DeductionsData;
  onUpdate: (data: DeductionsData) => void;
}

export function DeductionsForm({ data, onUpdate }: DeductionsFormProps) {
  const [deductionsData, setDeductionsData] = useState<DeductionsData>(data || {
    deductionType: 'standard',
    adjustments: {
      educatorExpenses: 0,
      hsa_contributions: 0,
      movingExpenses: 0,
      selfEmploymentTax: 0,
      studentLoanInterest: 0,
      tuitionAndFees: 0
    }
  });

  const updateData = (newData: Partial<DeductionsData>) => {
    const updated = { ...deductionsData, ...newData };
    setDeductionsData(updated);
    onUpdate(updated);
  };

  const addCharitableContribution = () => {
    const newContribution: CharitableContribution = {
      id: Date.now().toString(),
      organization: '',
      amount: 0,
      type: 'cash',
      dateOfContribution: ''
    };
    
    const currentItemized = deductionsData.itemizedDeductions || {
      medicalExpenses: 0,
      stateAndLocalTaxes: 0,
      mortgageInterest: 0,
      charitableContributions: [],
      miscellaneousDeductions: 0
    };

    updateData({
      itemizedDeductions: {
        ...currentItemized,
        charitableContributions: [...currentItemized.charitableContributions, newContribution]
      }
    });
  };

  const removeCharitableContribution = (id: string) => {
    if (!deductionsData.itemizedDeductions) return;
    
    updateData({
      itemizedDeductions: {
        ...deductionsData.itemizedDeductions,
        charitableContributions: deductionsData.itemizedDeductions.charitableContributions.filter(c => c.id !== id)
      }
    });
  };

  const updateCharitableContribution = (id: string, field: keyof CharitableContribution, value: string | number) => {
    if (!deductionsData.itemizedDeductions) return;
    
    const updated = deductionsData.itemizedDeductions.charitableContributions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    );
    
    updateData({
      itemizedDeductions: {
        ...deductionsData.itemizedDeductions,
        charitableContributions: updated
      }
    });
  };

  const standardDeductionAmount = 14600; // 2025 standard deduction for single filers

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Deductions
          </CardTitle>
          <CardDescription>
            Choose between standard or itemized deductions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={deductionsData.deductionType}
            onValueChange={(value) => updateData({ deductionType: value as 'standard' | 'itemized' })}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard" id="standard" />
              <Label htmlFor="standard" className="cursor-pointer">
                Standard Deduction (${standardDeductionAmount.toLocaleString()})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="itemized" id="itemized" />
              <Label htmlFor="itemized" className="cursor-pointer">
                Itemized Deductions
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {deductionsData.deductionType === 'itemized' && (
        <Tabs defaultValue="medical" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="taxes">Taxes</TabsTrigger>
            <TabsTrigger value="interest">Interest</TabsTrigger>
            <TabsTrigger value="charitable">Charitable</TabsTrigger>
          </TabsList>

          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle>Medical and Dental Expenses</CardTitle>
                <CardDescription>
                  Medical expenses that exceed 7.5% of your AGI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Total Medical Expenses</Label>
                  <Input
                    type="number"
                    value={deductionsData.itemizedDeductions?.medicalExpenses || 0}
                    onChange={(e) => updateData({
                      itemizedDeductions: {
                        ...deductionsData.itemizedDeductions!,
                        medicalExpenses: parseFloat(e.target.value) || 0
                      }
                    })}
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="taxes">
            <Card>
              <CardHeader>
                <CardTitle>State and Local Taxes</CardTitle>
                <CardDescription>
                  State income taxes, property taxes (limited to $10,000)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>State and Local Taxes Paid</Label>
                  <Input
                    type="number"
                    value={deductionsData.itemizedDeductions?.stateAndLocalTaxes || 0}
                    onChange={(e) => updateData({
                      itemizedDeductions: {
                        ...deductionsData.itemizedDeductions!,
                        stateAndLocalTaxes: parseFloat(e.target.value) || 0
                      }
                    })}
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interest">
            <Card>
              <CardHeader>
                <CardTitle>Mortgage Interest</CardTitle>
                <CardDescription>
                  Interest paid on mortgage for primary residence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Mortgage Interest Paid</Label>
                  <Input
                    type="number"
                    value={deductionsData.itemizedDeductions?.mortgageInterest || 0}
                    onChange={(e) => updateData({
                      itemizedDeductions: {
                        ...deductionsData.itemizedDeductions!,
                        mortgageInterest: parseFloat(e.target.value) || 0
                      }
                    })}
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charitable">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Charitable Contributions</CardTitle>
                    <CardDescription>Donations to qualified charities</CardDescription>
                  </div>
                  <Button onClick={addCharitableContribution} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Donation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deductionsData.itemizedDeductions?.charitableContributions?.map((contribution) => (
                    <div key={contribution.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">
                          {contribution.organization || 'New Donation'}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCharitableContribution(contribution.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Organization Name</Label>
                          <Input
                            value={contribution.organization}
                            onChange={(e) => updateCharitableContribution(contribution.id, 'organization', e.target.value)}
                            placeholder="Charity Name"
                          />
                        </div>
                        <div>
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            value={contribution.amount}
                            onChange={(e) => updateCharitableContribution(contribution.id, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Date of Contribution</Label>
                          <Input
                            type="date"
                            value={contribution.dateOfContribution}
                            onChange={(e) => updateCharitableContribution(contribution.id, 'dateOfContribution', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <RadioGroup
                            value={contribution.type}
                            onValueChange={(value) => updateCharitableContribution(contribution.id, 'type', value)}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cash" id={`cash-${contribution.id}`} />
                              <Label htmlFor={`cash-${contribution.id}`}>Cash</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="property" id={`property-${contribution.id}`} />
                              <Label htmlFor={`property-${contribution.id}`}>Property</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!deductionsData.itemizedDeductions?.charitableContributions || 
                    deductionsData.itemizedDeductions.charitableContributions.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No charitable contributions added. Click "Add Donation" to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Above-the-Line Adjustments</CardTitle>
          <CardDescription>
            These reduce your adjusted gross income
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Educator Expenses</Label>
              <Input
                type="number"
                value={deductionsData.adjustments.educatorExpenses}
                onChange={(e) => updateData({
                  adjustments: {
                    ...deductionsData.adjustments,
                    educatorExpenses: parseFloat(e.target.value) || 0
                  }
                })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>HSA Contributions</Label>
              <Input
                type="number"
                value={deductionsData.adjustments.hsa_contributions}
                onChange={(e) => updateData({
                  adjustments: {
                    ...deductionsData.adjustments,
                    hsa_contributions: parseFloat(e.target.value) || 0
                  }
                })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Student Loan Interest</Label>
              <Input
                type="number"
                value={deductionsData.adjustments.studentLoanInterest}
                onChange={(e) => updateData({
                  adjustments: {
                    ...deductionsData.adjustments,
                    studentLoanInterest: parseFloat(e.target.value) || 0
                  }
                })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Tuition and Fees</Label>
              <Input
                type="number"
                value={deductionsData.adjustments.tuitionAndFees}
                onChange={(e) => updateData({
                  adjustments: {
                    ...deductionsData.adjustments,
                    tuitionAndFees: parseFloat(e.target.value) || 0
                  }
                })}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}