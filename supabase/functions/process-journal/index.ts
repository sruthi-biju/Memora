import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { journalContent, userId } = await req.json();

    if (!journalContent) {
      return new Response(
        JSON.stringify({ error: "Journal content is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing journal entry for user:", userId);

    // Call Lovable AI to extract structured data
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get current date and time for context
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    const currentDateTime = now.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const systemPrompt = `You are a smart journal assistant that analyzes daily journal entries and extracts actionable information.

IMPORTANT: Today's current date and time is ${currentDateTime} (${currentDate} at ${currentTime}).
Use this as the reference point for all relative dates and times mentioned in the journal entry.

Extract the following from the journal entry:
1. Tasks/To-dos (things to do, goals, intentions) - set priority based on urgency/importance
2. Calendar Events (specific dates, times, meetings, appointments) - convert relative dates (today, tomorrow) to actual dates
3. Important Notes (insights, reflections, important information)
4. Health Mentions (exercise, diet, sleep, mood, symptoms, wellness activities)

For events: If time is mentioned, include it. If not mentioned but it's an event, use the current time: ${currentTime} as default.
Be smart about interpreting context (e.g., "tomorrow" = ${new Date(now.getTime() + 86400000).toISOString().split('T')[0]}).`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: journalContent },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_journal_data",
                description: "Extract structured data from journal entry",
                parameters: {
                  type: "object",
                  properties: {
                    tasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          priority: { type: "string", enum: ["low", "medium", "high"] }
                        },
                        required: ["title", "priority"],
                        additionalProperties: false
                      }
                    },
                    events: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          date: { type: "string" },
                          time: { type: "string" }
                        },
                        required: ["title"],
                        additionalProperties: false
                      }
                    },
                    notes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          content: { type: "string" }
                        },
                        required: ["content"],
                        additionalProperties: false
                      }
                    },
                    health: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          content: { type: "string" }
                        },
                        required: ["content"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["tasks", "events", "notes", "health"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "extract_journal_data" } }
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits depleted. Please add credits to continue.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI processing failed");
    }

    const aiData = await aiResponse.json();
    console.log("AI Response:", JSON.stringify(aiData, null, 2));
    
    // Extract structured data from tool call
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_journal_data") {
      throw new Error("AI did not return expected tool call");
    }
    
    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", extractedData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        content: journalContent,
      })
      .select()
      .single();

    if (journalError) {
      console.error("Error creating journal entry:", journalError);
      throw journalError;
    }

    console.log("Created journal entry:", journalEntry.id);

    // Insert tasks
    if (extractedData.tasks && extractedData.tasks.length > 0) {
      const tasksToInsert = extractedData.tasks.map((task: any) => ({
        user_id: userId,
        journal_entry_id: journalEntry.id,
        title: task.title,
        priority: task.priority || "medium",
      }));

      const { error: tasksError } = await supabase
        .from("tasks")
        .insert(tasksToInsert);

      if (tasksError) {
        console.error("Error inserting tasks:", tasksError);
      }
    }

    // Insert calendar events
    if (extractedData.events && extractedData.events.length > 0) {
      const eventsToInsert = extractedData.events.map((event: any) => ({
        user_id: userId,
        journal_entry_id: journalEntry.id,
        title: event.title,
        event_date: event.date || null,
        event_time: event.time || null,
      }));

      const { error: eventsError } = await supabase
        .from("calendar_events")
        .insert(eventsToInsert);

      if (eventsError) {
        console.error("Error inserting events:", eventsError);
      }
    }

    // Insert notes
    if (extractedData.notes && extractedData.notes.length > 0) {
      const notesToInsert = extractedData.notes.map((note: any) => ({
        user_id: userId,
        journal_entry_id: journalEntry.id,
        content: note.content,
      }));

      const { error: notesError } = await supabase
        .from("notes")
        .insert(notesToInsert);

      if (notesError) {
        console.error("Error inserting notes:", notesError);
      }
    }

    // Insert health mentions
    if (extractedData.health && extractedData.health.length > 0) {
      const healthToInsert = extractedData.health.map((health: any) => ({
        user_id: userId,
        journal_entry_id: journalEntry.id,
        content: health.content,
      }));

      const { error: healthError } = await supabase
        .from("health_mentions")
        .insert(healthToInsert);

      if (healthError) {
        console.error("Error inserting health mentions:", healthError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        journalEntryId: journalEntry.id,
        extracted: extractedData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-journal function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
