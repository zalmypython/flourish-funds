import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, Key, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { setAlphaVantageApiKey } from '../services/stockApi';
import { useToast } from './ui/use-toast';

export const ApiKeySetup = () => {
  const [apiKey, setApiKey] = useState('');
  const [isSet, setIsSet] = useState(!!localStorage.getItem('alphavantage_api_key'));
  const { toast } = useToast();

  const handleSetApiKey = () => {
    if (!apiKey.trim()) return;
    
    setAlphaVantageApiKey(apiKey);
    setIsSet(true);
    toast({
      title: "API Key Set! 🔑",
      description: "You can now access real-time stock data.",
    });
    setApiKey('');
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem('alphavantage_api_key');
    setIsSet(false);
    toast({
      title: "API Key Removed",
      description: "Stock data will use mock data.",
    });
  };

  if (isSet) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Real-time data enabled</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRemoveApiKey}>
              Remove Key
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Real-time Stock Data Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Currently using mock data. Get a free API key from Alpha Vantage for real-time stock prices.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="apiKey">Alpha Vantage API Key</Label>
          <div className="flex gap-2">
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Button onClick={handleSetApiKey} disabled={!apiKey.trim()}>
              Set Key
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="mb-2">To get your free API key:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Visit Alpha Vantage website</li>
            <li>Sign up for a free account</li>
            <li>Copy your API key</li>
            <li>Paste it above</li>
          </ol>
          <Button variant="link" size="sm" className="mt-2 p-0 h-auto" asChild>
            <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer">
              Get Free API Key <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};