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
    const { taskText, priority, dueTime, email, phone } = await req.json();

    if (!taskText) {
      return new Response(JSON.stringify({ error: "taskText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { email?: string; sms?: string } = {};

    // Send email via Resend
    if (email) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Task Manager <onboarding@resend.dev>",
            to: [email],
            subject: `⏰ Task Due: ${taskText}`,
            html: `
              <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px;">
                <h2 style="color: #1a1a2e; margin-bottom: 16px;">⏰ Task Reminder</h2>
                <div style="background: #f4f0ff; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
                  <p style="font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 8px 0;">${taskText}</p>
                  <p style="color: #666; margin: 4px 0;">Priority: <strong>${priority?.toUpperCase() || "MEDIUM"}</strong></p>
                  ${dueTime ? `<p style="color: #666; margin: 4px 0;">Due at: <strong>${dueTime}</strong></p>` : ""}
                </div>
                <p style="color: #999; font-size: 12px;">Sent from your Task Manager app</p>
              </div>
            `,
          }),
        });
        const emailBody = await emailRes.text();
        results.email = emailRes.ok ? "sent" : `failed: ${emailRes.status} - ${emailBody}`;
      } else {
        results.email = "no RESEND_API_KEY configured";
      }
    }

    // Send SMS via Twilio
    if (phone) {
      const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
      const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
      const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
        const body = new URLSearchParams({
          To: phone,
          From: TWILIO_FROM,
          Body: `⏰ Task Due: "${taskText}" | Priority: ${priority?.toUpperCase() || "MEDIUM"}${dueTime ? ` | Due: ${dueTime}` : ""}`,
        });

        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          }
        );
        results.sms = smsRes.ok ? "sent" : "failed";
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
