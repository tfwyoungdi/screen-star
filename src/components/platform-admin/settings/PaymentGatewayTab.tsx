import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, CheckCircle2, AlertCircle, Eye, EyeOff, 
  Loader2, ShieldCheck, Zap, ExternalLink 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentGatewayTabProps {
  formData: {
    subscription_payment_gateway: string;
    stripe_configured: boolean;
    flutterwave_configured: boolean;
    paystack_configured: boolean;
  };
  setFormData: (data: any) => void;
}

const paymentGateways = [
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    description: 'Accept payments from customers in Africa and globally',
    logo: '🌊',
    configuredKey: 'flutterwave_configured',
    docsUrl: 'https://developer.flutterwave.com/docs',
    publicKeyPrefix: 'FLWPUBK',
    secretKeyPrefix: 'FLWSECK',
    publicKeyPlaceholder: 'FLWPUBK-XXXXXXXXXXXX-X',
    secretKeyPlaceholder: 'FLWSECK-XXXXXXXXXXXX-X',
  },
  {
    id: 'paystack',
    name: 'Paystack',
    description: 'Simple, modern payments for Africa',
    logo: '💳',
    configuredKey: 'paystack_configured',
    docsUrl: 'https://paystack.com/docs',
    publicKeyPrefix: 'pk_',
    secretKeyPrefix: 'sk_',
    publicKeyPlaceholder: 'pk_test_XXXXXXXXXXXX',
    secretKeyPlaceholder: 'sk_test_XXXXXXXXXXXX',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Global payment processing platform',
    logo: '💰',
    configuredKey: 'stripe_configured',
    docsUrl: 'https://stripe.com/docs',
    publicKeyPrefix: 'pk_',
    secretKeyPrefix: 'sk_',
    publicKeyPlaceholder: 'pk_test_XXXXXXXXXXXX',
    secretKeyPlaceholder: 'sk_test_XXXXXXXXXXXX',
  },
];

export function PaymentGatewayTab({ formData, setFormData }: PaymentGatewayTabProps) {
  const selectedGateway = formData.subscription_payment_gateway || 'flutterwave';
  const gatewayConfig = paymentGateways.find((g) => g.id === selectedGateway)!;

  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
    isTestMode?: boolean;
  } | null>(null);

  const handleGatewayChange = (value: string) => {
    setFormData({ ...formData, subscription_payment_gateway: value });
    setPublicKey('');
    setSecretKey('');
    setTestResult(null);
    setShowSecret(false);
  };

  const handleTestConnection = async () => {
    if (!secretKey.trim()) {
      toast.error('Please enter a secret key to test');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('manage-platform-payment', {
        body: {
          action: 'test',
          gateway: selectedGateway,
          publicKey: publicKey.trim(),
          secretKey: secretKey.trim(),
        },
      });

      if (error) throw error;

      setTestResult(data);
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      toast.error('Failed to test connection. Please try again.');
      setTestResult({ valid: false, message: error.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!secretKey.trim()) {
      toast.error('Please enter a secret key');
      return;
    }

    if (!testResult?.valid) {
      toast.error('Please test the connection first to verify your keys are valid');
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-platform-payment', {
        body: {
          action: 'save',
          gateway: selectedGateway,
          publicKey: publicKey.trim(),
          secretKey: secretKey.trim(),
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${gatewayConfig.name} configured successfully`);
        setFormData({
          ...formData,
          subscription_payment_gateway: selectedGateway,
          [`${selectedGateway}_configured`]: true,
        });
        // Clear sensitive fields after save
        setSecretKey('');
        setPublicKey('');
        setTestResult(null);
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      console.error('Save keys error:', error);
      toast.error('Failed to save payment configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = formData[gatewayConfig.configuredKey as keyof typeof formData] as boolean;

  return (
    <div className="space-y-6">
      {/* Gateway Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Payment Gateway
          </CardTitle>
          <CardDescription>
            Select and configure the payment gateway for cinema subscription payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedGateway}
            onValueChange={handleGatewayChange}
            className="space-y-3"
          >
            {paymentGateways.map((gateway) => {
              const gwConfigured = formData[gateway.configuredKey as keyof typeof formData] as boolean;
              const isSelected = selectedGateway === gateway.id;

              return (
                <label
                  key={gateway.id}
                  className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={gateway.id} id={gateway.id} />
                  <div className="text-2xl">{gateway.logo}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{gateway.name}</span>
                      {gwConfigured ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{gateway.description}</p>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {gatewayConfig.name} API Keys
              </CardTitle>
              <CardDescription>
                Enter your {gatewayConfig.name} API keys to enable subscription payments
              </CardDescription>
            </div>
            <a
              href={gatewayConfig.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Docs
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isConfigured && !secretKey && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {gatewayConfig.name} is currently connected and active. Enter new keys below to update your configuration.
              </AlertDescription>
            </Alert>
          )}

          {/* Public Key */}
          <div className="space-y-2">
            <Label htmlFor="publicKey">Public Key</Label>
            <Input
              id="publicKey"
              type="text"
              placeholder={gatewayConfig.publicKeyPlaceholder}
              value={publicKey}
              onChange={(e) => {
                setPublicKey(e.target.value);
                setTestResult(null);
              }}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Starts with <code className="bg-muted px-1 py-0.5 rounded">{gatewayConfig.publicKeyPrefix}</code>
            </p>
          </div>

          {/* Secret Key */}
          <div className="space-y-2">
            <Label htmlFor="secretKey">Secret Key</Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecret ? 'text' : 'password'}
                placeholder={gatewayConfig.secretKeyPlaceholder}
                value={secretKey}
                onChange={(e) => {
                  setSecretKey(e.target.value);
                  setTestResult(null);
                }}
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Starts with <code className="bg-muted px-1 py-0.5 rounded">{gatewayConfig.secretKeyPrefix}</code> — never shared publicly
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert variant={testResult.valid ? 'default' : 'destructive'}>
              {testResult.valid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription className="flex items-center gap-2">
                {testResult.message}
                {testResult.isTestMode !== undefined && testResult.valid && (
                  <Badge variant={testResult.isTestMode ? 'secondary' : 'default'} className="ml-2">
                    {testResult.isTestMode ? 'Test Mode' : 'Live Mode'}
                  </Badge>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!secretKey.trim() || isTesting}
              className="flex items-center gap-2"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              onClick={handleSaveKeys}
              disabled={!testResult?.valid || isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save & Activate'}
            </Button>
          </div>

          {/* Security Note */}
          <div className="p-3 bg-muted/50 rounded-lg border mt-4">
            <p className="text-xs text-muted-foreground">
              <strong>🔒 Security:</strong> Your secret key is validated server-side and never stored in the browser. 
              The key is used to process subscription payments via secure edge functions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
