import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";

const Reports = () => {
  const reports = [
    { name: "Monthly Spending Report", period: "January 2024", size: "2.1 MB" },
    { name: "Net Worth Statement", period: "Q4 2023", size: "1.8 MB" },
    { name: "Tax Summary", period: "2023", size: "3.2 MB" },
    { name: "Budget vs Actual", period: "December 2023", size: "1.5 MB" }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Generate and download financial reports</p>
        </div>
        <Button className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, index) => (
          <Card key={index} className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {report.name}
              </CardTitle>
              <CardDescription>{report.period}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{report.size}</Badge>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reports;