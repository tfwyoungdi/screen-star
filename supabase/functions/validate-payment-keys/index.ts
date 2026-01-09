import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateKeysRequest {
  gateway: 'stripe' | 'flutterwave' | 'paystack';
  publicKey: string;
  secretKey: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("validate-payment-keys function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gateway, publicKey, secretKey }: ValidateKeysRequest = await req.json();
    
    console.log(`Validating ${gateway} keys`);

    let isValid = false;
    let message = "";
    let isTestMode = false;

    switch (gateway) {
      case 'stripe': {
        // Validate Stripe keys by attempting to retrieve account info
        // Public key validation: check format
        if (!publicKey.startsWith('pk_test_') && !publicKey.startsWith('pk_live_')) {
          return new Response(JSON.stringify({ 
            valid: false, 
            message: "Invalid Stripe publishable key format. Must start with pk_test_ or pk_live_" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
          return new Response(JSON.stringify({ 
            valid: false, 
            message: "Invalid Stripe secret key format. Must start with sk_test_ or sk_live_" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Check if keys match (both test or both live)
        const publicIsTest = publicKey.startsWith('pk_test_');
        const secretIsTest = secretKey.startsWith('sk_test_');
        
        if (publicIsTest !== secretIsTest) {
          return new Response(JSON.stringify({ 
            valid: false, 
            message: "Key mismatch: Both keys must be either test or live mode" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        isTestMode = secretIsTest;

        // Validate secret key by making a test API call
        const response = await fetch("https://api.stripe.com/v1/balance", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
          },
        });

        if (response.ok) {
          isValid = true;
          message = `Stripe keys validated successfully (${isTestMode ? 'Test' : 'Live'} mode)`;
        } else {
          const error = await response.json();
          message = error.error?.message || "Invalid Stripe secret key";
        }
        break;
      }

      case 'flutterwave': {
        // Validate Flutterwave keys
        if (!publicKey.startsWith('FLWPUBK_TEST') && !publicKey.startsWith('FLWPUBK-')) {
          return new Response(JSON.stringify({ 
            valid: false, 
            message: "Invalid Flutterwave public key format" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        if (!secretKey.startsWith('FLWSECK_TEST') && !secretKey.startsWith('FLWSECK-')) {
          return new Response(JSON.stringify({ 
            valid: false, 
            message: "Invalid Flutterwave secret key format" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        isTestMode = secretKey.includes('TEST');

        // Validate by checking account balance
        const response = await fetch("https://api.flutterwave.com/v3/balances", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
          },
        });

        if (response.ok) {
          isValid = true;
          message = `Flutterwave keys validated successfully (${isTestMode ? 'Test' : 'Live'} mode)`;
        } else {
          const error = await response.json();
          message = error.message || "Invalid Flutterwave secret key";
        }
        break;
      }

      case 'paystack': {
        // Validate Paystack keys
        if (!publicKey.startsWith('pk_test_') && !publicKey.startsWith('pk_live_')) {
          return new Response(JSON.stringify({ 
            valid: false, 
            message: "Invalid Paystack public key format. Must start with pk_test_ or pk_live_" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
          return new Response(JSON.stringify({ 
            valid: false, 
            message: "Invalid Paystack secret key format. Must start with sk_test_ or sk_live_" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Check if keys match (both test or both live)
        const publicIsTest = publicKey.startsWith('pk_test_');
        const secretIsTest = secretKey.startsWith('sk_test_');
        
        if (publicIsTest !== secretIsTest) {
          return new Response(JSON.stringify({ 
            valid: false, 
            message: "Key mismatch: Both keys must be either test or live mode" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        isTestMode = secretIsTest;

        // Validate by checking balance
        const response = await fetch("https://api.paystack.co/balance", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
          },
        });

        if (response.ok) {
          isValid = true;
          message = `Paystack keys validated successfully (${isTestMode ? 'Test' : 'Live'} mode)`;
        } else {
          const error = await response.json();
          message = error.message || "Invalid Paystack secret key";
        }
        break;
      }

      default:
        message = `Unsupported payment gateway: ${gateway}`;
    }

    console.log(`Validation result: ${isValid ? 'Valid' : 'Invalid'} - ${message}`);

    return new Response(JSON.stringify({ 
      valid: isValid, 
      message,
      isTestMode,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error validating keys:", error);
    return new Response(
      JSON.stringify({ valid: false, message: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
