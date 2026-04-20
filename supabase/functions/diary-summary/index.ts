import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().slice(0, 10);

    // Get all users with diary_email set
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id, diary_email")
      .not("diary_email", "is", null);

    if (settingsError) throw settingsError;
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: "No users with diary email configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "No RESEND_API_KEY configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { userId: string; status: string }[] = [];

    for (const setting of settings as any[]) {
      const { data: entries, error: entriesError } = await supabase
        .from("diary_entries")
        .select("hour, content")
        .eq("user_id", setting.user_id)
        .eq("date", today)
        .order("hour", { ascending: true });

      if (entriesError) {
        results.push({ userId: setting.user_id, status: `error: ${entriesError.message}` });
        continue;
      }

      if (!entries || entries.length === 0) {
        results.push({ userId: setting.user_id, status: "no entries today" });
        continue;
      }

      const formatHour = (h: number) => {
        const ampm = h >= 12 ? "PM" : "AM";
        const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${display}${ampm}`;
      };

      const filtered = entries.filter((e) => e.content.trim());
      if (filtered.length === 0) {
        results.push({ userId: setting.user_id, status: "empty entries" });
        continue;
      }

      const rowsHtml = filtered
        .map(
          (e) =>
            `<tr><td style="padding:8px 12px;font-weight:600;color:#4a3aff;white-space:nowrap;">${formatHour(
              e.hour
            )}</td><td style="padding:8px 12px;color:#1a1a2e;">${e.content
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</td></tr>`
        )
        .join("");

      const html = `
        <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;">
          <h2 style="color:#1a1a2e;margin:0 0 8px 0;">📝 Your Daily Diary Summary</h2>
          <p style="color:#666;margin:0 0 20px 0;">${today}</p>
          <table style="width:100%;border-collapse:collapse;background:#f4f0ff;border-radius:8px;overflow:hidden;">
            ${rowsHtml}
          </table>
          <p style="color:#999;font-size:12px;margin-top:24px;">— Daily Docket</p>
        </div>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Daily Docket <onboarding@resend.dev>",
          to: [setting.diary_email],
          subject: `📝 Your Diary Summary — ${today}`,
          html,
        }),
      });

      const body = await emailRes.text();
      results.push({
        userId: setting.user_id,
        status: emailRes.ok ? "sent" : `failed: ${emailRes.status} - ${body}`,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
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
