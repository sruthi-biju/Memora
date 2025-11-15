import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's journal entries
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (entriesError) throw entriesError;

    // Fetch tasks, notes, health mentions
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, completed')
      .eq('user_id', userId);

    const { data: healthMentions } = await supabase
      .from('health_mentions')
      .select('content')
      .eq('user_id', userId);

    // Prepare content for AI analysis
    const journalContent = entries?.map(e => e.content).join('\n\n') || 'No entries yet';
    const tasksSummary = tasks?.length 
      ? `${tasks.filter(t => t.completed).length} completed out of ${tasks.length} tasks`
      : 'No tasks';
    const healthSummary = healthMentions?.map(h => h.content).join(', ') || 'No health data';

    const prompt = `Analyze the following journal entries and provide insights:

Journal Entries:
${journalContent}

Tasks Status: ${tasksSummary}
Health Mentions: ${healthSummary}

Please provide:
1. Overall mood trend (positive, neutral, or negative)
2. A short, fun personality snapshot (2-3 sentences max, keep it light and engaging)
3. A motivational insight or quote tailored to this person
4. 2-3 concise growth suggestions (one sentence each, direct and actionable)

Format your response as JSON with these keys: mood, personality, motivation, suggestions (array)`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an insightful journal analyst. Provide thoughtful, encouraging analysis in valid JSON format only.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse AI response
    let insights;
    try {
      // Remove markdown code blocks if present
      const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback insights
      insights = {
        mood: 'neutral',
        personality: 'Thoughtful and curious, always exploring new ideas.',
        motivation: 'Keep moving forward, one day at a time.',
        suggestions: ['Continue journaling regularly', 'Set small achievable goals']
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
