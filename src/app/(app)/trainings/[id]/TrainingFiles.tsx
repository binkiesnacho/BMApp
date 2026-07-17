"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addTrainingFileAction,
  deleteTrainingFileAction,
  signTrainingFilesAction,
} from "../actions";
import type { TrainingFile } from "@/lib/types/database";

const MAX_MB = 15;
const ACCEPT = "image/*,application/pdf";

function human(bytes: number | null) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Adjuntos del entrenamiento (fotos y PDFs de material hecho a mano).
 * El bucket es privado: las fotos y los enlaces se sirven con URLs firmadas de
 * una hora, que se piden al montar.
 */
export default function TrainingFiles({
  trainingId,
  files,
  canEdit,
}: {
  trainingId: string;
  files: TrainingFile[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const paths = files.map((f) => f.path);
    if (paths.length === 0) return;
    let alive = true;
    signTrainingFilesAction(paths).then((m) => {
      if (alive) setUrls(m);
    });
    return () => {
      alive = false;
    };
  }, [files]);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    e.target.value = ""; // permite volver a subir el mismo fichero
    if (list.length === 0) return;
    setErr(null);
    setBusy(true);
    try {
      for (const file of list) {
        if (file.size > MAX_MB * 1024 * 1024) {
          throw new Error(`"${file.name}" supera ${MAX_MB} MB.`);
        }
        // La primera carpeta debe ser el id del entrenamiento: de ahí derivan
        // los permisos de Storage.
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${trainingId}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("training-files")
          .upload(path, file, { cacheControl: "3600" });
        if (upErr) throw upErr;

        const res = await addTrainingFileAction({
          trainingId,
          path,
          name: file.name,
          mime: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
        if (res.error) throw new Error(res.error);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    setErr(null);
    start(async () => {
      const res = await deleteTrainingFileAction(id);
      if (res.error) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {files.length === 0 && !canEdit && (
        <p className="text-xs text-label-3">Sin material adjunto.</p>
      )}

      <ul className="space-y-2">
        {files.map((f) => {
          const url = urls[f.path];
          const isImg = f.mime.startsWith("image/");
          return (
            <li key={f.id} className="overflow-hidden rounded-xl bg-canvas">
              {isImg && url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={f.name} className="max-h-72 w-full object-contain" />
              )}
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="shrink-0 text-lg">{isImg ? "🖼️" : "📄"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-label">{f.name}</p>
                  <p className="text-[11px] text-label-3">{human(f.size_bytes)}</p>
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-separator px-2.5 py-1.5 text-[12px] font-medium text-sky-200"
                  >
                    Abrir
                  </a>
                )}
                {canEdit && (
                  <button
                    onClick={() => remove(f.id)}
                    disabled={pending}
                    aria-label={`Eliminar ${f.name}`}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-[12px] text-label-3 hover:text-red-400 disabled:opacity-40"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <>
          <label className="tap mt-2 flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-separator text-[14px] font-medium text-label-2">
            {busy ? "Subiendo…" : "＋ Añadir foto o PDF"}
            <input
              type="file"
              accept={ACCEPT}
              multiple
              onChange={onFiles}
              disabled={busy}
              className="hidden"
            />
          </label>
          <p className="mt-1 text-[11px] text-label-3">
            Fotos o PDFs, hasta {MAX_MB} MB. Solo los ve tu equipo.
          </p>
        </>
      )}
      {err && <p className="mt-1 text-[13px] text-negative">{err}</p>}
    </div>
  );
}
