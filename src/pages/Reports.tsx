import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, Calendar, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";
import { AuthModal } from "@/components/AuthModal";
import { InsuranceDashboard } from "@/components/insurance/InsuranceDashboard";
import { useInsurance } from "@/hooks/useInsurance";

const Reports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleError, executeWithErrorHandling } = useErrorHandler('ReportsPage');
  const { policies, claims, createPolicy, createClaim } = useInsurance();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");

  if (!user) {
    return <AuthModal open={true} onOpenChange={() => {}} />;
  }

  const reports = [
    { 
      name: "Monthly Spending Report", 
      period: "January 2024", 
      size: "2.1 MB",
      type: "Spending Analysis",
      icon: BarChart3
    },
    { 
      name: "Net Worth Statement", 
      period: "Q4 2023", 
      size: "1.8 MB",
      type: "Net Worth",
      icon: TrendingUp
    },
    { 
      name: "Budget Performance", 
      period: "December 2023", 
      size: "1.5 MB",
      type: "Budget Analysis",
      icon: PieChart
    },
    { 
      name: "Cash Flow Summary", 
      period: "Q4 2023", 
      size: "2.3 MB",
      type: "Cash Flow",
      icon: BarChart3
    }
  ];

  const handleGenerateReport = async () => {
    if (!selectedReportType || !selectedPeriod) {
      logger.warn('Report generation attempted with missing parameters', {
        hasReportType: !!selectedReportType,
        hasPeriod: !!selectedPeriod
      });
      
      toast({
        title: "Missing Information",
        description: "Please select both report type and period.",
        variant: "destructive"
      });
      return;
    }
    
    const result = await executeWithErrorHandling(async () => {
      setIsGenerating(true);
      
      logger.info('Starting report generation', {
        reportType: selectedReportType,
        period: selectedPeriod,
        userId: user?.id
      });
      
      // Simulate report generation with realistic processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.info('Report generation completed', {
        reportType: selectedReportType,
        period: selectedPeriod
      });
      
      toast({
        title: "Report Generated",
        description: "Your financial report has been generated successfully.",
      });
      
      setSelectedReportType("");
      setSelectedPeriod("");
    }, { action: 'generate_report', additionalData: { reportType: selectedReportType, period: selectedPeriod } });
    
    setIsGenerating(false);
    return result;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Generate reports and manage your financial data</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Financial Report</DialogTitle>
              <DialogDescription>
                Create a detailed financial report for your records
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spending">Monthly Spending Report</SelectItem>
                    <SelectItem value="networth">Net Worth Statement</SelectItem>
                    <SelectItem value="budget">Budget Performance</SelectItem>
                    <SelectItem value="cashflow">Cash Flow Summary</SelectItem>
                    <SelectItem value="tax">Tax Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="period">Time Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Current Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                    <SelectItem value="last-year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                onClick={handleGenerateReport}
                disabled={isGenerating || !selectedReportType || !selectedPeriod}
              >
                {isGenerating ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{reports.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Available for download</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">2</p>
            <p className="text-sm text-muted-foreground mt-1">Reports generated</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">Today</p>
            <p className="text-sm text-muted-foreground mt-1">Data current</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">7.7 MB</p>
            <p className="text-sm text-muted-foreground mt-1">All reports</p>
          </CardContent>
        </Card>
      </div>

          {/* Reports Grid */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">Available Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report, index) => {
                const IconComponent = report.icon;
                return (
                  <Card key={index} className="shadow-card border-border/50 hover:shadow-elegant transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-primary" />
                        {report.name}
                      </CardTitle>
                      <CardDescription className="flex items-center justify-between">
                        <span>{report.period}</span>
                        <Badge variant="outline" className="text-xs">{report.type}</Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{report.size}</Badge>
                        <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="spending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spending Reports</CardTitle>
              <CardDescription>
                Analyze your spending patterns and trends across different categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Spending reports coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Income Reports</CardTitle>
              <CardDescription>
                Track your income sources and trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Income reports coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-6">
          <InsuranceDashboard
            policies={policies}
            claims={claims}
            onCreatePolicy={() => {
              // TODO: Open policy creation modal
              console.log('Create policy clicked');
            }}
            onCreateClaim={() => {
              // TODO: Open claim creation modal
              console.log('Create claim clicked');
            }}
            onViewPolicy={(policy) => {
              // TODO: Open policy details modal
              console.log('View policy:', policy);
            }}
            onViewClaim={(claim) => {
              // TODO: Open claim details modal
              console.log('View claim:', claim);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;