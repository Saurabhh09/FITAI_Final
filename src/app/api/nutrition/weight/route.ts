import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSameOrigin, readJson, jsonReadError } from "@/lib/api/request";
import { createSupabaseServerClient, isSupabaseConfigurationError } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const weightPayloadSchema = z.object({
  weightKg: z.number().min(20).max(500),
  recordedAt: z.string().optional(),
  note: z.string().max(500).nullish()
});

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJson(request);
  if (!body.ok) return jsonReadError(body);

  const parseResult = weightPayloadSchema.safeParse(body.value);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid weight entry payload." }, { status: 422 });
  }

  const { weightKg, recordedAt, note } = parseResult.data;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data, error: dbError } = await supabase
      .from("weight_entries")
      .insert({
        user_id: user.id,
        weight_kg: weightKg,
        recorded_at: recordedAt || new Date().toISOString(),
        note: note ?? null
      })
      .select("id, weight_kg, recorded_at")
      .single();

    if (dbError) {
      console.error("Weight entry save failed:", dbError);
      return NextResponse.json({ error: "Could not save weight entry." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, entry: data });
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }
    console.error("Weight entry service error:", error);
    return NextResponse.json({ error: "Weight service unavailable." }, { status: 503 });
  }
}
