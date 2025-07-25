import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, FirebaseDocument } from "@/hooks/useFirestore";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Home,
  Car,
  Briefcase,
  DollarSign,
  CreditCard,
  FileText,
  Edit,
  Trash2
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface Asset extends FirebaseDocument {
  name: string;
  type: string;
  value: number;
  description?: string;
}

interface Liability extends FirebaseDocument {
  name: string;
  type: string;
  balance: number;
  interestRate?: number;
  description?: string;
}

const NetWorth = () => {
  const { user } = useAuth();
  const { documents: assets, loading: assetsLoading, addDocument: addAsset, updateDocument: updateAsset, deleteDocument: deleteAsset } = useFirestore<Asset>('assets');
  const { documents: liabilities, loading: liabilitiesLoading, addDocument: addLiability, updateDocument: updateLiability, deleteDocument: deleteLiability } = useFirestore<Liability>('liabilities');
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [isLiabilityDialogOpen, setIsLiabilityDialogOpen] = useState(false);
  const [assetFormData, setAssetFormData] = useState({
    name: "",
    type: "",
    value: "",
    description: ""
  });
  const [liabilityFormData, setLiabilityFormData] = useState({
    name: "",
    type: "",
    balance: "",
    interestRate: "",
    description: ""
  });

  const { toast } = useToast();

  if (!user) {
    return <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />;
  }

  // Calculate totals
  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Mock historical data
  const historicalData = [
    { month: 'Jan', assets: totalAssets - 50000, liabilities: totalLiabilities - 5000, netWorth: (totalAssets - 50000) - (totalLiabilities - 5000) },
    { month: 'Feb', assets: totalAssets - 40000, liabilities: totalLiabilities - 4000, netWorth: (totalAssets - 40000) - (totalLiabilities - 4000) },
    { month: 'Mar', assets: totalAssets - 30000, liabilities: totalLiabilities - 3000, netWorth: (totalAssets - 30000) - (totalLiabilities - 3000) },
    { month: 'Apr', assets: totalAssets - 20000, liabilities: totalLiabilities - 2000, netWorth: (totalAssets - 20000) - (totalLiabilities - 2000) },
    { month: 'May', assets: totalAssets - 10000, liabilities: totalLiabilities - 1000, netWorth: (totalAssets - 10000) - (totalLiabilities - 1000) },
    { month: 'Jun', assets: totalAssets, liabilities: totalLiabilities, netWorth: netWorth },
  ];

  const chartConfig = {
    assets: { label: "Assets", color: "hsl(var(--success))" },
    liabilities: { label: "Liabilities", color: "hsl(var(--destructive))" },
    netWorth: { label: "Net Worth", color: "hsl(var(--primary))" }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "real-estate": return <Home className="h-4 w-4" />;
      case "vehicle": return <Car className="h-4 w-4" />;
      case "investment": return <Briefcase className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getLiabilityIcon = (type: string) => {
    switch (type) {
      case "mortgage": return <Home className="h-4 w-4" />;
      case "auto-loan": return <Car className="h-4 w-4" />;
      case "credit-card": return <CreditCard className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string, isAsset: boolean) => {
    if (isAsset) {
      switch (type) {
        case "real-estate": return "bg-success text-success-foreground";
        case "vehicle": return "bg-primary text-primary-foreground";
        case "investment": return "bg-accent text-accent-foreground";
        default: return "bg-muted text-muted-foreground";
      }
    } else {
      switch (type) {
        case "mortgage": return "bg-warning text-warning-foreground";
        case "auto-loan": return "bg-destructive text-destructive-foreground";
        case "credit-card": return "bg-orange-500 text-white";
        default: return "bg-muted text-muted-foreground";
      }
    }
  };

  const handleAddAsset = async () => {
    if (!assetFormData.name || !assetFormData.type || !assetFormData.value) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    await addAsset({
      name: assetFormData.name,
      type: assetFormData.type,
      value: parseFloat(assetFormData.value),
      description: assetFormData.description
    });

    setAssetFormData({ name: "", type: "", value: "", description: "" });
    setIsAssetDialogOpen(false);
  };

  const handleAddLiability = async () => {
    if (!liabilityFormData.name || !liabilityFormData.type || !liabilityFormData.balance) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    await addLiability({
      name: liabilityFormData.name,
      type: liabilityFormData.type,
      balance: parseFloat(liabilityFormData.balance),
      interestRate: liabilityFormData.interestRate ? parseFloat(liabilityFormData.interestRate) : undefined,
      description: liabilityFormData.description
    });

    setLiabilityFormData({ name: "", type: "", balance: "", interestRate: "", description: "" });
    setIsLiabilityDialogOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Net Worth</h1>
          <p className="text-muted-foreground mt-1">Track your assets and liabilities over time</p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Asset</DialogTitle>
                <DialogDescription>Add a new asset to track your net worth</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assetName">Asset Name</Label>
                  <Input 
                    id="assetName" 
                    value={assetFormData.name}
                    onChange={(e) => setAssetFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Primary Residence" 
                  />
                </div>
                <div>
                  <Label htmlFor="assetType">Asset Type</Label>
                  <Select value={assetFormData.type} onValueChange={(value) => setAssetFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="real-estate">Real Estate</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="cash">Cash & Bank</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assetValue">Current Value</Label>
                  <Input 
                    id="assetValue" 
                    type="number" 
                    value={assetFormData.value}
                    onChange={(e) => setAssetFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="500000" 
                  />
                </div>
                <div>
                  <Label htmlFor="assetDescription">Description (Optional)</Label>
                  <Input 
                    id="assetDescription" 
                    value={assetFormData.description}
                    onChange={(e) => setAssetFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional details" 
                  />
                </div>
                <Button onClick={handleAddAsset} className="w-full">Add Asset</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isLiabilityDialogOpen} onOpenChange={setIsLiabilityDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Liability
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Liability</DialogTitle>
                <DialogDescription>Add a new liability to track your debts</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="liabilityName">Liability Name</Label>
                  <Input 
                    id="liabilityName" 
                    value={liabilityFormData.name}
                    onChange={(e) => setLiabilityFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Home Mortgage" 
                  />
                </div>
                <div>
                  <Label htmlFor="liabilityType">Liability Type</Label>
                  <Select value={liabilityFormData.type} onValueChange={(value) => setLiabilityFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select liability type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="auto-loan">Auto Loan</SelectItem>
                      <SelectItem value="credit-card">Credit Card</SelectItem>
                      <SelectItem value="student-loan">Student Loan</SelectItem>
                      <SelectItem value="personal-loan">Personal Loan</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="liabilityBalance">Current Balance</Label>
                  <Input 
                    id="liabilityBalance" 
                    type="number" 
                    value={liabilityFormData.balance}
                    onChange={(e) => setLiabilityFormData(prev => ({ ...prev, balance: e.target.value }))}
                    placeholder="250000" 
                  />
                </div>
                <div>
                  <Label htmlFor="interestRate">Interest Rate % (Optional)</Label>
                  <Input 
                    id="interestRate" 
                    type="number" 
                    step="0.01"
                    value={liabilityFormData.interestRate}
                    onChange={(e) => setLiabilityFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                    placeholder="3.25" 
                  />
                </div>
                <div>
                  <Label htmlFor="liabilityDescription">Description (Optional)</Label>
                  <Input 
                    id="liabilityDescription" 
                    value={liabilityFormData.description}
                    onChange={(e) => setLiabilityFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional details" 
                  />
                </div>
                <Button onClick={handleAddLiability} className="w-full">Add Liability</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">${totalAssets.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">{assets.length} items</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">${totalLiabilities.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">{liabilities.length} items</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ${netWorth.toLocaleString()}
            </p>
            <p className="text-sm text-success mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +8.3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Net Worth Trend Chart */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Net Worth Trend</CardTitle>
          <CardDescription>Your financial progress over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="assets"
                  stackId="1"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="liabilities"
                  stackId="2"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.6}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Assets and Liabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(asset.type, true)}`}>
                    {getAssetIcon(asset.type)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{asset.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{asset.type.replace('-', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-success">${asset.value.toLocaleString()}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteAsset(asset.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {assets.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p>No assets added yet</p>
                <p className="text-sm">Start by adding your first asset</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {liabilities.map((liability) => (
              <div key={liability.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(liability.type, false)}`}>
                    {getLiabilityIcon(liability.type)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{liability.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {liability.type.replace('-', ' ')}
                      {liability.interestRate && ` • ${liability.interestRate}% APR`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-destructive">${liability.balance.toLocaleString()}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteLiability(liability.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {liabilities.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p>No liabilities added yet</p>
                <p className="text-sm">Great! You have no recorded debts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NetWorth;