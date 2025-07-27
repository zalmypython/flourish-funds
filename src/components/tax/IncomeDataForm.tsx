import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeData, W2Income, Form1099Income } from "@/types/tax";
import { Plus, Trash2, DollarSign } from "lucide-react";

interface IncomeDataFormProps {
  data?: IncomeData;
  onUpdate: (data: IncomeData) => void;
}

export function IncomeDataForm({ data, onUpdate }: IncomeDataFormProps) {
  const [incomeData, setIncomeData] = useState<IncomeData>(data || {
    w2Income: [],
    form1099Income: [],
    selfEmploymentIncome: [],
    retirementIncome: [],
    unemploymentCompensation: 0,
    socialSecurityBenefits: 0,
    otherIncome: []
  });

  const updateData = (newData: Partial<IncomeData>) => {
    const updated = { ...incomeData, ...newData };
    setIncomeData(updated);
    onUpdate(updated);
  };

  const addW2 = () => {
    const newW2: W2Income = {
      id: Date.now().toString(),
      employer: '',
      ein: '',
      wages: 0,
      federalTaxWithheld: 0,
      socialSecurityWages: 0,
      socialSecurityTaxWithheld: 0,
      medicareWages: 0,
      medicareTaxWithheld: 0,
      stateTaxWithheld: 0,
      stateWages: 0,
      state: ''
    };
    updateData({ w2Income: [...incomeData.w2Income, newW2] });
  };

  const add1099 = () => {
    const new1099: Form1099Income = {
      id: Date.now().toString(),
      type: '1099-INT',
      payer: '',
      ein: '',
      amount: 0,
      federalTaxWithheld: 0,
      stateTaxWithheld: 0,
      description: ''
    };
    updateData({ form1099Income: [...incomeData.form1099Income, new1099] });
  };

  const removeW2 = (id: string) => {
    updateData({ w2Income: incomeData.w2Income.filter(w2 => w2.id !== id) });
  };

  const remove1099 = (id: string) => {
    updateData({ form1099Income: incomeData.form1099Income.filter(form => form.id !== id) });
  };

  const updateW2 = (id: string, field: keyof W2Income, value: string | number) => {
    const updated = incomeData.w2Income.map(w2 => 
      w2.id === id ? { ...w2, [field]: value } : w2
    );
    updateData({ w2Income: updated });
  };

  const update1099 = (id: string, field: keyof Form1099Income, value: string | number) => {
    const updated = incomeData.form1099Income.map(form => 
      form.id === id ? { ...form, [field]: value } : form
    );
    updateData({ form1099Income: updated });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Income Information
          </CardTitle>
          <CardDescription>
            Enter all income sources for the tax year
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="w2" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="w2">W-2 Income</TabsTrigger>
          <TabsTrigger value="1099">1099 Forms</TabsTrigger>
          <TabsTrigger value="self-employment">Self Employment</TabsTrigger>
          <TabsTrigger value="other">Other Income</TabsTrigger>
        </TabsList>

        <TabsContent value="w2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>W-2 Wage Income</CardTitle>
                  <CardDescription>Income from employers</CardDescription>
                </div>
                <Button onClick={addW2} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add W-2
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {incomeData.w2Income.map((w2) => (
                  <div key={w2.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">W-2 from {w2.employer || 'New Employer'}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeW2(w2.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Employer Name</Label>
                        <Input
                          value={w2.employer}
                          onChange={(e) => updateW2(w2.id, 'employer', e.target.value)}
                          placeholder="Company Name"
                        />
                      </div>
                      <div>
                        <Label>Employer EIN</Label>
                        <Input
                          value={w2.ein}
                          onChange={(e) => updateW2(w2.id, 'ein', e.target.value)}
                          placeholder="XX-XXXXXXX"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Wages (Box 1)</Label>
                        <Input
                          type="number"
                          value={w2.wages}
                          onChange={(e) => updateW2(w2.id, 'wages', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Federal Tax Withheld (Box 2)</Label>
                        <Input
                          type="number"
                          value={w2.federalTaxWithheld}
                          onChange={(e) => updateW2(w2.id, 'federalTaxWithheld', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Social Security Wages (Box 3)</Label>
                        <Input
                          type="number"
                          value={w2.socialSecurityWages}
                          onChange={(e) => updateW2(w2.id, 'socialSecurityWages', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Social Security Tax Withheld (Box 4)</Label>
                        <Input
                          type="number"
                          value={w2.socialSecurityTaxWithheld}
                          onChange={(e) => updateW2(w2.id, 'socialSecurityTaxWithheld', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {incomeData.w2Income.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No W-2 forms added. Click "Add W-2" to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="1099">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>1099 Forms</CardTitle>
                  <CardDescription>Interest, dividends, and other income</CardDescription>
                </div>
                <Button onClick={add1099} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add 1099
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {incomeData.form1099Income.map((form1099) => (
                  <div key={form1099.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{form1099.type} from {form1099.payer || 'New Payer'}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove1099(form1099.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Form Type</Label>
                        <Select
                          value={form1099.type}
                          onValueChange={(value) => update1099(form1099.id, 'type', value as Form1099Income['type'])}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1099-INT">1099-INT (Interest)</SelectItem>
                            <SelectItem value="1099-DIV">1099-DIV (Dividends)</SelectItem>
                            <SelectItem value="1099-NEC">1099-NEC (Nonemployee Compensation)</SelectItem>
                            <SelectItem value="1099-MISC">1099-MISC (Miscellaneous)</SelectItem>
                            <SelectItem value="1099-G">1099-G (Government Payments)</SelectItem>
                            <SelectItem value="1099-R">1099-R (Retirement Distributions)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Payer Name</Label>
                        <Input
                          value={form1099.payer}
                          onChange={(e) => update1099(form1099.id, 'payer', e.target.value)}
                          placeholder="Company/Institution Name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          value={form1099.amount}
                          onChange={(e) => update1099(form1099.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Federal Tax Withheld</Label>
                        <Input
                          type="number"
                          value={form1099.federalTaxWithheld}
                          onChange={(e) => update1099(form1099.id, 'federalTaxWithheld', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        value={form1099.description}
                        onChange={(e) => update1099(form1099.id, 'description', e.target.value)}
                        placeholder="Description of income"
                      />
                    </div>
                  </div>
                ))}
                {incomeData.form1099Income.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No 1099 forms added. Click "Add 1099" to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="self-employment">
          <Card>
            <CardHeader>
              <CardTitle>Self-Employment Income</CardTitle>
              <CardDescription>Business income and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Self-employment income form coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other">
          <Card>
            <CardHeader>
              <CardTitle>Other Income</CardTitle>
              <CardDescription>Unemployment, Social Security, and other income</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unemployment Compensation</Label>
                  <Input
                    type="number"
                    value={incomeData.unemploymentCompensation}
                    onChange={(e) => updateData({ unemploymentCompensation: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Social Security Benefits</Label>
                  <Input
                    type="number"
                    value={incomeData.socialSecurityBenefits}
                    onChange={(e) => updateData({ socialSecurityBenefits: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}