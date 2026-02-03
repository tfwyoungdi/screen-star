import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  accessCode: string;
  organizationId: string;
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { accessCode, organizationId, userId }: ValidationRequest = await req.json();
    
    // Validate required fields
    if (!accessCode || typeof accessCode !== 'string' || accessCode.length !== 6) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Access code must be exactly 6 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!/^\d{6}$/.test(accessCode)) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Access code must contain only numbers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!organizationId || !userId) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check rate limit (5 attempts per 10 minutes per user)
    const rateLimitKey = `access_code:${userId}`;
    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: rateLimitData, error: rateLimitError } = await supabaseAdmin
      .from('rate_limit_entries')
      .select('request_count')
      .eq('key', rateLimitKey)
      .gte('window_start', windowStart)
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Count total attempts in window
    const { count: attemptCount } = await supabaseAdmin
      .from('rate_limit_entries')
      .select('*', { count: 'exact', head: true })
      .eq('key', rateLimitKey)
      .gte('window_start', windowStart);
    
    if ((attemptCount || 0) >= 5) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Too many attempts. Please wait 10 minutes before trying again.',
          rateLimited: true
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log this attempt
    await supabaseAdmin
      .from('rate_limit_entries')
      .insert({ key: rateLimitKey, request_count: 1 });
    
    // Fetch organization access code using service role (bypasses RLS)
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('daily_access_code, daily_access_code_set_at, daily_access_code_start_time, daily_access_code_end_time')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !org) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if access code is set
    if (!org.daily_access_code) {
      return new Response(
        JSON.stringify({ valid: false, error: 'No access code has been set today. Please contact your manager.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if code was set today (midnight expiry)
    if (org.daily_access_code_set_at) {
      const codeSetAt = new Date(org.daily_access_code_set_at);
      const today = new Date();
      const isToday = codeSetAt.toDateString() === today.toDateString();
      
      if (!isToday) {
        return new Response(
          JSON.stringify({ valid: false, error: "Yesterday's access code has expired. Please ask your manager to set a new code." }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Validate access code (constant-time comparison to prevent timing attacks)
    const storedCode = org.daily_access_code;
    if (accessCode.length !== storedCode.length) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid access code. Please check with your manager.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Constant-time string comparison
    let isMatch = true;
    for (let i = 0; i < accessCode.length; i++) {
      if (accessCode[i] !== storedCode[i]) {
        isMatch = false;
      }
    }
    
    if (!isMatch) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid access code. Please check with your manager.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check time window validity
    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 8); // HH:MM:SS format
    
    if (org.daily_access_code_start_time && currentTimeStr < org.daily_access_code_start_time) {
      const startHours = parseInt(org.daily_access_code_start_time.slice(0, 2));
      const startMinutes = parseInt(org.daily_access_code_start_time.slice(3, 5));
      const period = startHours >= 12 ? 'PM' : 'AM';
      const displayHours = startHours > 12 ? startHours - 12 : (startHours === 0 ? 12 : startHours);
      const startDisplay = `${displayHours}:${startMinutes.toString().padStart(2, '0')} ${period}`;
      
      return new Response(
        JSON.stringify({ valid: false, error: `Access code is not valid yet. It becomes active at ${startDisplay}.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (org.daily_access_code_end_time && currentTimeStr > org.daily_access_code_end_time) {
      const endHours = parseInt(org.daily_access_code_end_time.slice(0, 2));
      const endMinutes = parseInt(org.daily_access_code_end_time.slice(3, 5));
      const period = endHours >= 12 ? 'PM' : 'AM';
      const displayHours = endHours > 12 ? endHours - 12 : (endHours === 0 ? 12 : endHours);
      const endDisplay = `${displayHours}:${endMinutes.toString().padStart(2, '0')} ${period}`;
      
      return new Response(
        JSON.stringify({ valid: false, error: `Access code has expired. It was valid until ${endDisplay}.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Success - access code is valid
    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Access code validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Server error during validation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
