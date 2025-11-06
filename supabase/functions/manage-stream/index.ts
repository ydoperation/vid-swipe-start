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

    const { streamId, action } = await req.json();

    if (!streamId || !action) {
      throw new Error('Missing required fields: streamId and action');
    }

    let result;
    if (action === 'end') {
      const { data, error } = await supabaseClient
        .from('live_streams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
        })
        .eq('id', streamId)
        .select()
        .single();

      if (error) throw error;
      result = data;

      console.log(`Admin ${user.id} ended stream ${streamId}`);
    } else {
      throw new Error('Invalid action. Use: end');
    }

    // Log the admin action
    await supabaseClient.from('admin_actions').insert({
      admin_id: user.id,
      action: `stream_${action}`,
      target_type: 'live_stream',
      target_id: streamId,
      metadata: { action },
    });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in manage-stream:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
