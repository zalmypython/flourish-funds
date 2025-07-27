import { useState } from "react";
import { useIncomeSources } from "@/hooks/useIncomeSources";
import { Transaction, INCOME_SOURCE_TYPES } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DollarSign, TrendingUp, Plus } from "lucide-react";

interface IncomeNotificationPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  onComplete?: () => void;
}

export function IncomeNotificationPrompt({ 
  open, 
  onOpenChange, 
  transaction, 
  onComplete 
}: IncomeNotificationPromptProps) {
  const { 
    incomeSources, 
    linkTransaction, 
    createIncomeSource, 
    createPayerRule,
    isLinking, 
    isCreating,
    isCreatingRule 
  } = useIncomeSources();
  
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createRuleForFuture, setCreateRuleForFuture] = useState(true);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState<string>("other");

  const activeIncomeSources = incomeSources.filter(source => source.isActive);

  const handleLinkToExisting = async () => {
    if (!selectedSourceId) return;

    try {
      await linkTransaction({ 
        incomeSourceId: selectedSourceId, 
        transactionId: transaction.id 
      });

      // Optionally create a payer rule for future automation
      if (createRuleForFuture && transaction.merchant) {
        await createPayerRule({
          incomeSourceId: selectedSourceId,
          ruleData: {
            ruleType: 'exactPayer',
            pattern: transaction.merchant,
            description: `Auto-created rule for ${transaction.merchant}`,
            isActive: true
          }
        });
      }

      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to link transaction:', error);
    }
  };

  const handleCreateNew = async () => {
    if (!newSourceName.trim()) return;

    try {
      // Create new income source
      const newSource = await createIncomeSource({
        name: newSourceName,
        type: newSourceType as any,
        isActive: true,
        color: INCOME_SOURCE_TYPES.find(t => t.value === newSourceType)?.color || '#3b82f6',
        icon: INCOME_SOURCE_TYPES.find(t => t.value === newSourceType)?.icon || 'dollar-sign'
      });

      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create income source:', error);
    }
  };

  const transactionAmount = transaction.amount > 0 ? transaction.amount : Math.abs(transaction.amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Income Received!
          </DialogTitle>
          <DialogDescription>
            We detected an income transaction. Would you like to categorize it?
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>${transactionAmount.toLocaleString()}</span>
              <Badge variant="outline" className="text-green-600">
                Income
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transaction.merchant && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium">{transaction.merchant}</span>
              </div>
            )}
            {transaction.description && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Description:</span>
                <span className="text-xs">{transaction.description}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date:</span>
              <span>{new Date(transaction.date).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {!showCreateForm ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">
                Link to existing income source:
              </Label>
              <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select an income source" />
                </SelectTrigger>
                <SelectContent>
                  {activeIncomeSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: source.color }}
                        />
                        {source.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSourceId && transaction.merchant && (
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Switch
                  id="create-rule"
                  checked={createRuleForFuture}
                  onCheckedChange={setCreateRuleForFuture}
                />
                <Label htmlFor="create-rule" className="text-sm">
                  Auto-categorize future transactions from "{transaction.merchant}"
                </Label>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleLinkToExisting}
                disabled={!selectedSourceId || isLinking || isCreatingRule}
                className="flex-1"
              >
                {isLinking || isCreatingRule ? 'Linking...' : 'Link Transaction'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Income Source Name:</Label>
              <Input
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="e.g., Freelance Client Work"
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Type:</Label>
              <Select value={newSourceType} onValueChange={setNewSourceType}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_SOURCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateNew}
                disabled={!newSourceName.trim() || isCreating}
                className="flex-1"
              >
                {isCreating ? 'Creating...' : 'Create & Link'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-sm"
          >
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}