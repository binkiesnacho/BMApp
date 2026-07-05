"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ClubBadge from "@/components/ui/ClubBadge";
import { setClubLogoAction } from "./actions";

export default function LogoUploader({
  clubId,
  clubName,
  logoUrl,
}: {
  clubId: string;
  clubName: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${clubId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("club-logos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("club-logos").getPublicUrl(path);
      await setClubLogoAction(data.publicUrl);
      setPreview(data.publicUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <ClubBadge name={clubName} logoUrl={preview} size={56} />
      <div className="flex-1">
        <label className="inline-flex cursor-pointer items-center rounded-xl bg-surface-2 px-3 py-2 text-[14px] font-medium text-brand tap">
          {busy ? "Subiendo…" : preview ? "Cambiar logo" : "Subir logo"}
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            disabled={busy}
            className="hidden"
          />
        </label>
        <p className="mt-1 text-[12px] text-label-3">
          PNG o JPG. Se mostrará recortado y centrado.
        </p>
        {error && <p className="mt-1 text-[13px] text-negative">{error}</p>}
      </div>
    </div>
  );
}
