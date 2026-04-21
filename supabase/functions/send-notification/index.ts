import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskText, priority, dueTime, email, minutesBefore } = await req.json();

    if (!taskText) {
      return new Response(JSON.stringify({ error: "taskText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "no RESEND_API_KEY configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timeLabel = minutesBefore !== undefined ? `${minutesBefore} min before` : "now";

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Task Manager <noreply@mail.trybuild.in>",
        to: [email],
        subject: `⏰ Task Reminder (${timeLabel}): ${taskText}`,
        html: `
          <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px;">
            <h2 style="color: #1a1a2e; margin-bottom: 16px;">⏰ Task Reminder (${timeLabel})</h2>
            <div style="background: #f4f0ff; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <p style="font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 8px 0;">${taskText}</p>
              <p style="color: #666; margin: 4px 0;">Priority: <strong>${(priority || "medium").toUpperCase()}</strong></p>
              ${dueTime ? `<p style="color: #666; margin: 4px 0;">Due at: <strong>${dueTime}</strong></p>` : ""}
            </div>
            <p style="color: #999; font-size: 12px;">Sent from your Task Manager app</p>
          </div>
        `,
      }),
    });

    const body = await emailRes.text();
    const status = emailRes.ok ? "sent" : `failed: ${emailRes.status} - ${body}`;
    console.log("Resend email result:", status);

    return new Response(JSON.stringify({ success: emailRes.ok, results: { email: status } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
