import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSameOrigin, readJson, jsonReadError } from "@/lib/api/request";
import { createSupabaseServerClient, isSupabaseConfigurationError } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const waterPayloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  volumeMl: z.number().min(0).max(20000)
});

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJson(request);
  if (!body.ok) return jsonReadError(body);

  const parseResult = waterPayloadSchema.safeParse(body.value);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid hydration payload." }, { status: 422 });
  }

  const { date, volumeMl } = parseResult.data;

  try {
    const supabase = await createSupabaseServerClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { error: dbError } = await supabase
      .from("hydration_logs")
      .upsert(
        {
          user_id: user.id,
          local_date: date,
          volume_ml: volumeMl
        },
        { onConflict: "user_id,local_date" }
      );

    if (dbError) {
      console.error("Hydration log save failed:", dbError);
      return NextResponse.json({ error: "Could not save hydration log." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, date, volumeMl });
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }
    console.error("Hydration service error:", error);
    return NextResponse.json({ error: "Hydration service unavailable." }, { status: 503 });
  }
}
