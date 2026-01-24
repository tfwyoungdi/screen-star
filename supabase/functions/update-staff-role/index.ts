import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user management
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to verify caller
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callerUser) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, newRole, organizationId } = await req.json();

    // Validate input
    if (!userId || !newRole || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'userId, newRole, and organizationId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['box_office', 'gate_staff', 'manager', 'accountant', 'supervisor'];
    if (!validRoles.includes(newRole)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is a cinema_admin for this organization
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('organization_id', organizationId)
      .eq('role', 'cinema_admin')
      .single();

    if (roleError || !callerRole) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Only cinema admins can update staff roles' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify target user belongs to the same organization
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (profileError || !targetProfile) {
      console.error('Profile check error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Staff member not found in your organization' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check target user's current role (prevent modifying cinema_admin)
    const { data: targetRole, error: targetRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (targetRoleError) {
      console.error('Target role check error:', targetRoleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify staff role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetRole?.role === 'cinema_admin') {
      return new Response(
        JSON.stringify({ error: 'Cannot modify cinema admin role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent changing own role
    if (userId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot change your own role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the role
    const { error: updateError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (updateError) {
      console.error('Role update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Role updated for user ${userId} to ${newRole} by admin ${callerUser.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Role updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
