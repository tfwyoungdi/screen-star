import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SSLInfo {
  valid: boolean;
  issuer?: string;
  expiresAt?: string;
  daysUntilExpiry?: number;
  error?: string;
}

async function checkSSL(domain: string): Promise<SSLInfo> {
  try {
    // Try to make an HTTPS request to check if SSL is working
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
    });
    
    clearTimeout(timeoutId);
    
    // If we got a response, SSL is working
    return {
      valid: true,
      issuer: 'Valid SSL Certificate',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check specific error types
    if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
      return {
        valid: false,
        error: 'SSL certificate error - certificate may be invalid or expired',
      };
    }
    
    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      return {
        valid: false,
        error: 'Domain not found - DNS not configured',
      };
    }
    
    if (errorMessage.includes('ECONNREFUSED')) {
      return {
        valid: false,
        error: 'Connection refused - server not responding on HTTPS',
      };
    }
    
    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      return {
        valid: false,
        error: 'Connection timed out - server not responding',
      };
    }
    
    return {
      valid: false,
      error: `Unable to verify SSL: ${errorMessage}`,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying domain: ${domain}`);

    // Clean the domain (remove protocol if present)
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Try to resolve DNS using Google's DNS-over-HTTPS
    const dnsUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CNAME`;
    
    console.log(`Checking DNS at: ${dnsUrl}`);
    
    const dnsResponse = await fetch(dnsUrl, {
      headers: { 'Accept': 'application/dns-json' }
    });

    if (!dnsResponse.ok) {
      console.error(`DNS lookup failed with status: ${dnsResponse.status}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          verified: false,
          error: 'Failed to perform DNS lookup',
          details: 'Could not query DNS records. Please try again later.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dnsData = await dnsResponse.json();
    console.log('DNS response:', JSON.stringify(dnsData));

    // Check for CNAME records pointing to cinitix.app
    const cnameRecords = dnsData.Answer?.filter((record: any) => record.type === 5) || [];
    const hasCorrectCname = cnameRecords.some((record: any) => 
      record.data?.toLowerCase().includes('cinitix.app')
    );

    // Also check A records as fallback
    const aUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`;
    const aResponse = await fetch(aUrl, {
      headers: { 'Accept': 'application/dns-json' }
    });
    const aData = await aResponse.json();
    console.log('A record response:', JSON.stringify(aData));

    const aRecords = aData.Answer?.filter((record: any) => record.type === 1) || [];
    const hasARecord = aRecords.length > 0;

    // Check SSL certificate
    console.log(`Checking SSL for: ${cleanDomain}`);
    const sslInfo = await checkSSL(cleanDomain);
    console.log('SSL check result:', JSON.stringify(sslInfo));

    // Determine verification status
    let verified = false;
    let status = 'not_configured';
    let message = '';
    let details = '';

    if (hasCorrectCname) {
      verified = true;
      status = 'verified';
      message = 'Domain verified successfully!';
      details = `CNAME record correctly pointing to cinitix.app`;
    } else if (hasARecord) {
      verified = true;
      status = 'verified';
      message = 'Domain configured with A record';
      details = `A record found: ${aRecords.map((r: any) => r.data).join(', ')}`;
    } else if (dnsData.Status === 3) {
      status = 'not_found';
      message = 'Domain not found';
      details = 'The domain does not exist or has no DNS records configured.';
    } else if (dnsData.Status === 0 && !cnameRecords.length && !aRecords.length) {
      status = 'pending';
      message = 'DNS records not yet configured';
      details = 'Please add the required DNS records at your domain provider. Changes can take up to 48 hours to propagate.';
    } else {
      status = 'misconfigured';
      message = 'DNS configuration issue';
      details = 'The domain exists but is not configured correctly. Please verify your CNAME record points to cinitix.app';
    }

    console.log(`Verification result for ${cleanDomain}: ${status}, SSL valid: ${sslInfo.valid}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        verified,
        status,
        message,
        details,
        records: {
          cname: cnameRecords.map((r: any) => r.data),
          a: aRecords.map((r: any) => r.data)
        },
        ssl: sslInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Domain verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        verified: false,
        error: 'Verification failed',
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
