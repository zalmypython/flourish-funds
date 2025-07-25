import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  CreditCard, 
  AlertTriangle,
  Calendar,
  Percent,
  MoreHorizontal,
  Eye,
  EyeOff,
  Edit,
  Trash2
} from "lucide-react";

interface CreditCardData {
  id: string;
  name: string;
  issuer: string;
  type: string;
  limit: number;
  balance: number;
  dueDate: string;
  interestRate: number;
  isActive: boolean;
  bonuses: {
    id: string;
    description: string;
    status: "In Progress" | "Completed" | "Expired";
    requirement?: string;
  }[];
}

const CreditCards = () => {
  const [cards, setCards] = useState<CreditCardData[]>([
    {
      id: "1",
      name: "Chase Sapphire Preferred",
      issuer: "Chase",
      type: "Travel",
      limit: 15000,
      balance: 2400,
      dueDate: "2024-02-15",
      interestRate: 19.99,
      isActive: true,
      bonuses: [
        {
          id: "b1",
          description: "60k points welcome bonus",
          status: "Completed",
          requirement: "Spend $4,000 in 3 months"
        }
      ]
    },
    {
      id: "2",
      name: "Citi Double Cash",
      issuer: "Citi",
      type: "Cashback",
      limit: 8000,
      balance: 1250,
      dueDate: "2024-02-20",
      interestRate: 18.24,
      isActive: true,
      bonuses: [
        {
          id: "b2",
          description: "$200 cash back",
          status: "In Progress",
          requirement: "Spend $1,500 in 6 months"
        }
      ]
    },
    {
      id: "3",
      name: "Discover It",
      issuer: "Discover",
      type: "Cashback",
      limit: 5000,
      balance: 0,
      dueDate: "2024-02-10",
      interestRate: 16.99,
      isActive: false,
      bonuses: []
    }
  ]);

  const [showBalances, setShowBalances] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    issuer: "",
    type: "",
    limit: "",
    interestRate: ""
  });

  const { toast } = useToast();

  const activeCards = cards.filter(card => card.isActive);
  const inactiveCards = cards.filter(card => !card.isActive);
  const totalBalance = activeCards.reduce((sum, card) => sum + card.balance, 0);
  const totalLimit = activeCards.reduce((sum, card) => sum + card.limit, 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 30) return "text-success";
    if (utilization < 70) return "text-warning";
    return "text-destructive";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-success text-success-foreground";
      case "In Progress": return "bg-warning text-warning-foreground";
      case "Expired": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCardTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "travel": return "bg-primary text-primary-foreground";
      case "cashback": return "bg-accent text-accent-foreground";
      case "rewards": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleAddCard = () => {
    if (!formData.name || !formData.issuer || !formData.type || !formData.limit || !formData.interestRate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newCard: CreditCardData = {
      id: Date.now().toString(),
      name: formData.name,
      issuer: formData.issuer,
      type: formData.type,
      limit: parseFloat(formData.limit),
      balance: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      interestRate: parseFloat(formData.interestRate),
      isActive: true,
      bonuses: []
    };

    setCards(prev => [...prev, newCard]);
    setFormData({ name: "", issuer: "", type: "", limit: "", interestRate: "" });
    setIsAddDialogOpen(false);
    
    toast({
      title: "Success",
      description: `${formData.name} has been added to your credit cards.`
    });
  };

  const handleDeleteCard = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    setCards(prev => prev.filter(c => c.id !== cardId));
    
    toast({
      title: "Card Deleted",
      description: `${card?.name} has been removed from your credit cards.`
    });
  };

  const handleToggleCardStatus = (cardId: string) => {
    setCards(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, isActive: !card.isActive }
        : card
    ));

    const card = cards.find(c => c.id === cardId);
    toast({
      title: card?.isActive ? "Card Deactivated" : "Card Activated",
      description: `${card?.name} has been ${card?.isActive ? 'deactivated' : 'activated'}.`
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Credit Cards</h1>
          <p className="text-muted-foreground mt-1">Track credit cards, balances, and rewards</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowBalances(!showBalances)}
            className="gap-2"
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBalances ? "Hide" : "Show"} Balances
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Credit Card</DialogTitle>
                <DialogDescription>
                  Add a credit card to track spending and rewards
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardName">Card Name</Label>
                  <Input 
                    id="cardName" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Chase Sapphire Preferred" 
                  />
                </div>
                <div>
                  <Label htmlFor="issuer">Issuer</Label>
                  <Input 
                    id="issuer" 
                    value={formData.issuer}
                    onChange={(e) => setFormData(prev => ({ ...prev, issuer: e.target.value }))}
                    placeholder="e.g. Chase, Citi, American Express" 
                  />
                </div>
                <div>
                  <Label htmlFor="cardType">Card Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select card type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cashback">Cashback</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Rewards">Rewards</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="limit">Credit Limit</Label>
                    <Input 
                      id="limit" 
                      type="number" 
                      value={formData.limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, limit: e.target.value }))}
                      placeholder="10000" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input 
                      id="interestRate" 
                      type="number" 
                      step="0.01" 
                      value={formData.interestRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                      placeholder="19.99" 
                    />
                  </div>
                </div>
                <Button onClick={handleAddCard} className="w-full">Add Card</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {showBalances ? `$${totalBalance.toLocaleString()}` : "••••••"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Across {activeCards.length} cards</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credit Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getUtilizationColor(utilization)}`}>
              {utilization.toFixed(1)}%
            </p>
            <Progress value={utilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {showBalances ? `$${(totalLimit - totalBalance).toLocaleString()}` : "••••••"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total limit: ${totalLimit.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Bonuses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">
              {activeCards.flatMap(card => card.bonuses).filter(bonus => bonus.status === "In Progress").length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Cards */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Active Cards</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeCards.map((card) => {
            const cardUtilization = (card.balance / card.limit) * 100;
            return (
              <Card key={card.id} className="shadow-card border-border/50 hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getCardTypeColor(card.type)}`}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{card.name}</CardTitle>
                        <CardDescription>{card.issuer} • {card.type}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleCardStatus(card.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCard(card.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span className="text-sm text-muted-foreground">
                        {showBalances ? `$${card.balance.toLocaleString()} / $${card.limit.toLocaleString()}` : "•••••• / ••••••"}
                      </span>
                    </div>
                    <Progress value={cardUtilization} className="h-2" />
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-sm font-medium ${getUtilizationColor(cardUtilization)}`}>
                        {cardUtilization.toFixed(1)}% utilization
                      </span>
                      {cardUtilization > 70 && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-xs">High utilization</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(card.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Interest Rate</p>
                      <p className="font-medium flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {card.interestRate}%
                      </p>
                    </div>
                  </div>

                  {card.bonuses.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Sign-up Bonuses</p>
                      <div className="space-y-2">
                        {card.bonuses.map((bonus) => (
                          <div key={bonus.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                            <div>
                              <p className="text-sm font-medium">{bonus.description}</p>
                              {bonus.requirement && (
                                <p className="text-xs text-muted-foreground">{bonus.requirement}</p>
                              )}
                            </div>
                            <Badge className={getStatusColor(bonus.status)}>
                              {bonus.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Make Payment
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      View Transactions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Inactive Cards */}
      {inactiveCards.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Inactive Cards</h2>
          <div className="space-y-3">
            {inactiveCards.map((card) => (
              <Card key={card.id} className="shadow-card border-border/50 opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getCardTypeColor(card.type)} opacity-50`}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{card.name}</h3>
                        <p className="text-sm text-muted-foreground">{card.issuer} • {card.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Inactive</Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Limit: ${card.limit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditCards;