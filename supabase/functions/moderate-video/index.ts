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

    // Get the user from the auth header
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

    const { videoId, action } = await req.json();

    if (!videoId || !action) {
      throw new Error('Missing required fields: videoId and action');
    }

    // Perform moderation action
    let result;
    if (action === 'unpublish') {
      const { data, error } = await supabaseClient
        .from('videos')
        .update({ is_published: false })
        .eq('id', videoId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else if (action === 'publish') {
      const { data, error } = await supabaseClient
        .from('videos')
        .update({ is_published: true })
        .eq('id', videoId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else if (action === 'delete') {
      const { error } = await supabaseClient
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      result = { deleted: true };
    } else {
      throw new Error('Invalid action. Use: unpublish, publish, or delete');
    }

    // Log the admin action
    await supabaseClient.from('admin_actions').insert({
      admin_id: user.id,
      action: `video_${action}`,
      target_type: 'video',
      target_id: videoId,
      metadata: { action },
    });

    console.log(`Admin ${user.id} performed ${action} on video ${videoId}`);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in moderate-video:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
