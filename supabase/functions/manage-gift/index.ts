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

    const { action, giftId, giftData } = await req.json();

    if (!action) {
      throw new Error('Missing required field: action');
    }

    let result;
    if (action === 'create') {
      if (!giftData || !giftData.name || !giftData.price) {
        throw new Error('Missing gift data: name and price required');
      }

      const { data, error } = await supabaseClient
        .from('gifts')
        .insert({
          name: giftData.name,
          price: giftData.price,
          icon: giftData.icon || '🎁',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else if (action === 'toggle') {
      if (!giftId) {
        throw new Error('Missing required field: giftId');
      }

      // Get current state
      const { data: currentGift } = await supabaseClient
        .from('gifts')
        .select('is_active')
        .eq('id', giftId)
        .single();

      const { data, error } = await supabaseClient
        .from('gifts')
        .update({ is_active: !currentGift?.is_active })
        .eq('id', giftId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else if (action === 'update') {
      if (!giftId || !giftData) {
        throw new Error('Missing required fields: giftId and giftData');
      }

      const { data, error } = await supabaseClient
        .from('gifts')
        .update(giftData)
        .eq('id', giftId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      throw new Error('Invalid action. Use: create, toggle, or update');
    }

    // Log the admin action
    await supabaseClient.from('admin_actions').insert({
      admin_id: user.id,
      action: `gift_${action}`,
      target_type: 'gift',
      target_id: giftId || result.id,
      metadata: { action, giftData },
    });

    console.log(`Admin ${user.id} performed ${action} on gift`);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in manage-gift:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
