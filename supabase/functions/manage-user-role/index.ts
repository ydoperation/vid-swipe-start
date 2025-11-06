import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id,
    });

    if (adminError || !isAdmin) {
      console.error('Admin check failed:', adminError);
      throw new Error('Unauthorized: Admin access required');
    }

    const { action, targetUserId, role } = await req.json();

    if (!action || !targetUserId) {
      throw new Error('Missing required fields: action and targetUserId');
    }

    // Validate role
    const validRoles = ['admin', 'moderator', 'user'];
    if (role && !validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    let result;
    if (action === 'assign') {
      if (!role) {
        throw new Error('Missing required field: role');
      }

      // First remove any existing roles for this user
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId);

      // Then assign the new role
      const { data, error } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: targetUserId,
          role: role,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else if (action === 'remove') {
      const { error } = await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId);

      if (error) throw error;
      result = { removed: true, user_id: targetUserId };
    } else {
      throw new Error('Invalid action. Use: assign or remove');
    }

    // Log the admin action
    await supabaseClient.from('admin_actions').insert({
      admin_id: user.id,
      action: `role_${action}`,
      target_type: 'user',
      target_id: targetUserId,
      metadata: { action, role },
    });

    console.log(`Admin ${user.id} performed ${action} role ${role || ''} for user ${targetUserId}`);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in manage-user-role:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
