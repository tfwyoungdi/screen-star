import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

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
  },
  {
    id: 'paystack',
    name: 'Paystack',
    description: 'Simple, modern payments for Africa',
    logo: '💳',
    configuredKey: 'paystack_configured',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Global payment processing platform',
    logo: '💰',
    configuredKey: 'stripe_configured',
  },
];

export function PaymentGatewayTab({ formData, setFormData }: PaymentGatewayTabProps) {
  const selectedGateway = formData.subscription_payment_gateway || 'flutterwave';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Payment Gateway
          </CardTitle>
          <CardDescription>
            Select the payment gateway for processing cinema subscription payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedGateway}
            onValueChange={(value) => setFormData({ ...formData, subscription_payment_gateway: value })}
            className="space-y-4"
          >
            {paymentGateways.map((gateway) => {
              const isConfigured = formData[gateway.configuredKey as keyof typeof formData] as boolean;
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
                      {isConfigured ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Not Configured
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

      {/* Gateway-specific configuration */}
      <Card>
        <CardHeader>
          <CardTitle>
            {paymentGateways.find((g) => g.id === selectedGateway)?.name} Configuration
          </CardTitle>
          <CardDescription>
            Configure your {paymentGateways.find((g) => g.id === selectedGateway)?.name} API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> For security, API keys are stored as environment secrets and cannot be displayed here.
              To update your {paymentGateways.find((g) => g.id === selectedGateway)?.name} keys, please update the following
              environment secrets in your Supabase project:
            </p>
            <ul className="mt-2 text-sm space-y-1">
              {selectedGateway === 'flutterwave' && (
                <li className="font-mono text-xs bg-background px-2 py-1 rounded">FLUTTERWAVE_SECRET_KEY</li>
              )}
              {selectedGateway === 'paystack' && (
                <li className="font-mono text-xs bg-background px-2 py-1 rounded">PAYSTACK_SECRET_KEY</li>
              )}
              {selectedGateway === 'stripe' && (
                <li className="font-mono text-xs bg-background px-2 py-1 rounded">STRIPE_SECRET_KEY</li>
              )}
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="mark-configured">Mark as configured</Label>
            <input
              type="checkbox"
              id="mark-configured"
              checked={formData[`${selectedGateway}_configured` as keyof typeof formData] as boolean}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [`${selectedGateway}_configured`]: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-muted-foreground">
              (Check this after adding the secret key to your environment)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
