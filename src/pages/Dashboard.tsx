import { useState } from "react";
import { useApiAuth } from "@/hooks/useApiAuth";
import { AuthModal } from "@/components/AuthModal";
import { FinancialHealthDashboard } from "@/components/FinancialHealthDashboard";
import { FinancialOverview } from "@/components/FinancialOverview";
import { AchievementsCenter } from "@/components/AchievementsCenter";
import { QuickTransactionEntry } from "@/components/QuickTransactionEntry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye,
  EyeOff,
  TrendingUp,
  Zap,
  BarChart3
} from "lucide-react";

const Dashboard = () => {
  const { user } = useApiAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBalances, setShowBalances] = useState(true);

  if (!user) {
    return <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive financial management and insights
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowBalances(!showBalances)}
          className="gap-2"
        >
          {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showBalances ? "Hide" : "Show"} Balances
        </Button>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Actions
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            Achievements
          </TabsTrigger>
        </TabsList>

        {/* Financial Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <FinancialOverview 
            showAmounts={showBalances} 
            onToggleAmounts={() => setShowBalances(!showBalances)} 
          />
        </TabsContent>

        {/* Financial Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <FinancialHealthDashboard />
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="quick" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickTransactionEntry />
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Quick Tools</CardTitle>
                <CardDescription>
                  Frequently used financial tools and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-16 flex-col">
                    <span className="text-xs">Transfer</span>
                    <span className="font-medium">Money</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex-col">
                    <span className="text-xs">Pay</span>
                    <span className="font-medium">Credit Card</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex-col">
                    <span className="text-xs">Set</span>
                    <span className="font-medium">Budget</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex-col">
                    <span className="text-xs">Create</span>
                    <span className="font-medium">Goal</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <AchievementsCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;