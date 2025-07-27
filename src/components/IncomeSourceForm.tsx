import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useIncomeSources } from "@/hooks/useIncomeSources";
import { INCOME_SOURCE_TYPES, IncomeSource, PayerRule } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Palette } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const incomeSourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['salary', 'freelance', 'gig', 'business', 'investment', 'gifts', 'government', 'other']),
  employer: z.string().max(100).optional(),
  expectedMonthlyAmount: z.number().positive().optional(),
  isActive: z.boolean(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  icon: z.string().min(1).max(50)
});

const payerRuleSchema = z.object({
  ruleType: z.enum(['exactPayer', 'partialDescription', 'amountPattern', 'accountBased']),
  pattern: z.string().min(1, "Pattern is required").max(200),
  description: z.string().max(500).optional(),
  amountRange: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional(),
  accountId: z.string().optional(),
  isActive: z.boolean()
});

type IncomeSourceFormData = z.infer<typeof incomeSourceSchema>;
type PayerRuleFormData = z.infer<typeof payerRuleSchema>;

interface IncomeSourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeSource?: IncomeSource;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', 
  '#06b6d4', '#ec4899', '#6b7280', '#64748b'
];

export function IncomeSourceForm({ open, onOpenChange, incomeSource }: IncomeSourceFormProps) {
  const { createIncomeSource, updateIncomeSource, createPayerRule, isCreating, isUpdating } = useIncomeSources();
  const [payerRules, setPayerRules] = useState<PayerRuleFormData[]>(
    incomeSource?.payerRules?.map(rule => ({
      ruleType: rule.ruleType,
      pattern: rule.pattern,
      description: rule.description,
      amountRange: rule.amountRange,
      accountId: rule.accountId,
      isActive: rule.isActive
    })) || []
  );
  const [showPayerRuleForm, setShowPayerRuleForm] = useState(false);

  const form = useForm<IncomeSourceFormData>({
    resolver: zodResolver(incomeSourceSchema),
    defaultValues: {
      name: incomeSource?.name || "",
      description: incomeSource?.description || "",
      type: incomeSource?.type || "other",
      employer: incomeSource?.employer || "",
      expectedMonthlyAmount: incomeSource?.expectedMonthlyAmount || undefined,
      isActive: incomeSource?.isActive ?? true,
      color: incomeSource?.color || DEFAULT_COLORS[0],
      icon: incomeSource?.icon || "dollar-sign"
    }
  });

  const payerRuleForm = useForm<PayerRuleFormData>({
    resolver: zodResolver(payerRuleSchema),
    defaultValues: {
      ruleType: "exactPayer",
      pattern: "",
      description: "",
      isActive: true
    }
  });

  const onSubmit = async (data: IncomeSourceFormData) => {
    try {
      if (incomeSource) {
        updateIncomeSource({ id: incomeSource.id, data });
      } else {
        createIncomeSource({
          ...data,
          name: data.name!,
          color: data.color!,
          icon: data.icon!,
          isActive: data.isActive!,
          type: data.type!
        });
      }
      onOpenChange(false);
      form.reset();
      setPayerRules([]);
    } catch (error) {
      console.error('Failed to save income source:', error);
    }
  };

  const addPayerRule = (ruleData: PayerRuleFormData) => {
    setPayerRules(prev => [...prev, ruleData]);
    setShowPayerRuleForm(false);
    payerRuleForm.reset();
  };

  const removePayerRule = (index: number) => {
    setPayerRules(prev => prev.filter((_, i) => i !== index));
  };

  const selectedType = INCOME_SOURCE_TYPES.find(t => t.value === form.watch('type'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {incomeSource ? 'Edit Income Source' : 'Create Income Source'}
          </DialogTitle>
          <DialogDescription>
            Set up an income source to track your earnings and automate categorization
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Flower Shop Income" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select income type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INCOME_SOURCE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional description of this income source"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employer/Client</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC Company" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedMonthlyAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Monthly Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 5000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex gap-2 flex-wrap">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            field.value === color ? 'border-primary' : 'border-muted'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable this income source
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Payer Rules Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Payer Rules</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPayerRuleForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Set up rules to automatically categorize incoming transactions (e.g., "Joe Smith" → "Flower Shop Income")
                </p>
              </CardHeader>
              <CardContent>
                {payerRules.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No payer rules configured. Add rules to automatically categorize future transactions.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payerRules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{rule.ruleType}</Badge>
                            <span className="font-medium">{rule.pattern}</span>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePayerRule(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {showPayerRuleForm && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-base">Add Payer Rule</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Rule Type</Label>
                          <Select 
                            value={payerRuleForm.watch('ruleType')} 
                            onValueChange={(value) => payerRuleForm.setValue('ruleType', value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exactPayer">Exact Payer Match</SelectItem>
                              <SelectItem value="partialDescription">Partial Description</SelectItem>
                              <SelectItem value="amountPattern">Amount Pattern</SelectItem>
                              <SelectItem value="accountBased">Account Based</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Pattern</Label>
                          <Input 
                            placeholder="e.g., Joe Smith, UBER, 2500"
                            {...payerRuleForm.register('pattern')}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Description (Optional)</Label>
                        <Input 
                          placeholder="e.g., Regular client payments"
                          {...payerRuleForm.register('description')}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={payerRuleForm.handleSubmit(addPayerRule)}
                        >
                          Add Rule
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowPayerRuleForm(false);
                            payerRuleForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? 'Saving...' : incomeSource ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}