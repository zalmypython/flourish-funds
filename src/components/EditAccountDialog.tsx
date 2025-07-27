import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const editAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(50, "Name too long"),
  type: z.string().min(1, "Account type is required"),
  currentBalance: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Balance must be a valid positive number"
  }),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  description: z.string().optional()
});

type EditAccountFormData = z.infer<typeof editAccountSchema>;

interface BankAccount {
  id: string;
  name: string;
  type: string;
  currentBalance?: number;
  initialBalance: number;
  accountNumber?: string;
  routingNumber?: string;
  description?: string;
  isActive: boolean;
}

interface EditAccountDialogProps {
  account: BankAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (accountId: string, updates: Partial<BankAccount>) => Promise<void>;
}

export function EditAccountDialog({ account, open, onOpenChange, onSave }: EditAccountDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditAccountFormData>({
    resolver: zodResolver(editAccountSchema),
    defaultValues: {
      name: account?.name || "",
      type: account?.type || "",
      currentBalance: String(account?.currentBalance || account?.initialBalance || 0),
      accountNumber: account?.accountNumber || "",
      routingNumber: account?.routingNumber || "",
      description: account?.description || ""
    }
  });

  // Reset form when account changes
  React.useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        type: account.type,
        currentBalance: String(account.currentBalance || account.initialBalance || 0),
        accountNumber: account.accountNumber || "",
        routingNumber: account.routingNumber || "",
        description: account.description || ""
      });
    }
  }, [account, form]);

  const onSubmit = async (data: EditAccountFormData) => {
    if (!account) return;

    setIsSubmitting(true);
    try {
      await onSave(account.id, {
        name: data.name,
        type: data.type,
        currentBalance: parseFloat(data.currentBalance),
        accountNumber: data.accountNumber ? `****${data.accountNumber.slice(-4)}` : account.accountNumber,
        routingNumber: data.routingNumber || account.routingNumber,
        description: data.description
      });

      toast({
        title: "Account Updated",
        description: "Bank account has been updated successfully.",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update your bank account information.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Checking Account" {...field} />
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
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Balance</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Last 4 digits" maxLength={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this account" 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}