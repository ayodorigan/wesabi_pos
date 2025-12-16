import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: requesterProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (!requesterProfile || !['super_admin', 'admin'].includes(requesterProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only admins can create users.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, name, phone, role }: CreateUserRequest = await req.json();

    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, name, and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['super_admin', 'admin', 'sales', 'inventory', 'stock_take'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, role }
    });

    if (createError) {
      const errorMessage = createError.message.toLowerCase().includes('already')
        ? 'A user with this email already exists'
        : createError.message;

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create authentication user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        name,
        phone: phone || null,
        role,
        is_active: true,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return new Response(
        JSON.stringify({
          error: `Failed to create user profile: ${profileError.message}. User creation rolled back.`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name,
          role
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});