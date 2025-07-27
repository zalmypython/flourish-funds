import { useState } from "react";
import { useIncomeSources } from "@/hooks/useIncomeSources";
import { INCOME_SOURCE_TYPES } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, TrendingUp, Edit2, Trash2 } from "lucide-react";
import { IncomeSourceForm } from "./IncomeSourceForm";

export function IncomeSourceManager() {
  const { incomeSources, isLoading, getTotalExpectedMonthlyIncome, deleteIncomeSource } = useIncomeSources();
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);

  if (isLoading) {
    return <div className="text-center py-8">Loading income sources...</div>;
  }

  const totalExpected = getTotalExpectedMonthlyIncome();
  const activeSourcesCount = incomeSources.filter(source => source.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Income Sources</h2>
          <p className="text-muted-foreground">
            Manage your income streams and track earnings
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Income Source
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSourcesCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Monthly</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpected.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incomeSources.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {incomeSources.map((source) => {
          const typeInfo = INCOME_SOURCE_TYPES.find(t => t.value === source.type);
          
          return (
            <Card key={source.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{source.name}</CardTitle>
                  <Badge variant={source.isActive ? "default" : "secondary"}>
                    {source.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>{source.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Badge variant="outline" style={{ color: typeInfo?.color }}>
                      {typeInfo?.label}
                    </Badge>
                  </div>
                  
                  {source.expectedMonthlyAmount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expected Monthly:</span>
                      <span className="font-medium">${source.expectedMonthlyAmount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {source.employer && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Employer:</span>
                      <span className="text-sm">{source.employer}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Linked Transactions:</span>
                    <span className="text-sm">{source.linkedTransactionIds.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payer Rules:</span>
                    <span className="text-sm">{source.payerRules.length}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSource(source)}
                    className="flex-1"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteIncomeSource(source.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {incomeSources.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No income sources yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your income sources to track your earnings
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Income Source
            </Button>
          </CardContent>
        </Card>
      )}

      <IncomeSourceForm
        open={showForm || !!editingSource}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingSource(null);
          }
        }}
        incomeSource={editingSource}
      />
    </div>
  );
}