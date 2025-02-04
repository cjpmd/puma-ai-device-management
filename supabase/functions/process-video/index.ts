import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { videoId, frameNumber, playerIds } = await req.json()
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    console.log('Processing video frame:', { videoId, frameNumber, playerIds })

    // Mock YOLO detection for now - will be replaced with actual ML processing
    const mockDetections = playerIds.map(playerId => ({
      player_id: playerId,
      frame_number: frameNumber,
      x_coord: Math.random() * 100,
      y_coord: Math.random() * 100,
      confidence: 0.95
    }))

    console.log('Generated mock detections:', mockDetections)

    // Store detections
    const { error } = await supabase
      .from('player_tracking')
      .insert(mockDetections.map(detection => ({
        video_id: videoId,
        ...detection
      })))

    if (error) {
      console.error('Error storing detections:', error)
      throw error
    }

    console.log('Successfully stored detections')

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})