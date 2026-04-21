import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth user (for logging)
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseAuthed = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await supabaseAuthed.auth.getUser();
  const userId = userData?.user?.id ?? null;

  const logEntry = async (entry: Record<string, unknown>) => {
    try {
      await supabaseAuthed.from("email_send_log").insert(entry);
    } catch (e) {
      console.error("Failed to log email entry:", e);
    }
  };

  try {
    const { taskText, taskId, priority, dueTime, email, minutesBefore } = await req.json();

    if (!taskText || !email) {
      return new Response(JSON.stringify({ error: "taskText and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      await logEntry({
        user_id: userId,
        task_id: taskId ?? null,
        recipient_email: email,
        minutes_before: minutesBefore ?? null,
        status: "failed",
        error_message: "no RESEND_API_KEY configured",
      });
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
        from: "Task Manager <noreply@send.mail.trybuild.in>",
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
    let messageId: string | null = null;
    try { messageId = JSON.parse(body)?.id ?? null; } catch { /* ignore */ }

    if (emailRes.ok) {
      console.log("Resend email result: sent");
      await logEntry({
        user_id: userId,
        task_id: taskId ?? null,
        recipient_email: email,
        minutes_before: minutesBefore ?? null,
        status: "sent",
        message_id: messageId,
      });
    } else {
      console.log("Resend email result: failed", emailRes.status, body);
      await logEntry({
        user_id: userId,
        task_id: taskId ?? null,
        recipient_email: email,
        minutes_before: minutesBefore ?? null,
        status: "failed",
        error_message: `${emailRes.status}: ${body}`.slice(0, 1000),
      });
    }

    return new Response(JSON.stringify({ success: emailRes.ok, messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    await logEntry({
      user_id: userId,
      recipient_email: "unknown",
      status: "failed",
      error_message: (error as Error).message?.slice(0, 1000),
    });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
