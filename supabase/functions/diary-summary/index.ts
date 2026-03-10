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

    // Get all users with diary_phone set
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id, diary_phone")
      .not("diary_phone", "is", null);

    if (settingsError) throw settingsError;
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: "No users with diary phone configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MESSAGEBIRD_API_KEY = Deno.env.get("MESSAGEBIRD_API_KEY");
    if (!MESSAGEBIRD_API_KEY) {
      return new Response(JSON.stringify({ error: "No MESSAGEBIRD_API_KEY configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { userId: string; status: string }[] = [];

    for (const setting of settings) {
      // Get diary entries for today
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

      // Build summary
      const formatHour = (h: number) => {
        const ampm = h >= 12 ? "PM" : "AM";
        const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${display}${ampm}`;
      };

      const summary = entries
        .filter((e) => e.content.trim())
        .map((e) => `${formatHour(e.hour)}: ${e.content}`)
        .join("\n");

      if (!summary) {
        results.push({ userId: setting.user_id, status: "empty entries" });
        continue;
      }

      const smsBody = `📝 Your Daily Diary Summary (${today}):\n\n${summary}\n\n— Daily Docket`;

      const params = new URLSearchParams();
      params.append("originator", "DailyDkt");
      params.append("recipients", setting.diary_phone);
      params.append("body", smsBody);

      const smsRes = await fetch("https://rest.messagebird.com/messages", {
        method: "POST",
        headers: {
          Authorization: `AccessKey ${MESSAGEBIRD_API_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      results.push({
        userId: setting.user_id,
        status: smsRes.ok ? "sent" : `failed: ${smsRes.status}`,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
