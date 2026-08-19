import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, SUPABASE_PRODUCT_PHOTOS_BUCKET } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(SUPABASE_PRODUCT_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(SUPABASE_PRODUCT_PHOTOS_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
