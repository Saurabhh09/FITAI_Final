import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSameOrigin } from "@/lib/api/request";
import { createSupabaseServerClient, isSupabaseConfigurationError } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid("Invalid meal item ID.");

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const { id: rawId } = await context.params;
  const parseResult = idSchema.safeParse(rawId);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid meal item ID." }, { status: 422 });
  }

  const itemId = parseResult.data;

  let supabase;
  let user;
  try {
    supabase = await createSupabaseServerClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    user = authUser;
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not verify session." }, { status: 503 });
  }

  try {
    const { error: deleteError } = await supabase
      .from("meal_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete meal item failed:", deleteError);
      return NextResponse.json({ error: "Could not delete meal item." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deletedId: itemId });
  } catch (error) {
    console.error("Delete meal item error:", error);
    return NextResponse.json({ error: "Meal item service unavailable." }, { status: 503 });
  }
}
