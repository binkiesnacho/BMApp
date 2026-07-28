import { createClient } from "@/lib/supabase/client";
import { addTrainingFileAction } from "@/app/(app)/trainings/actions";

export const MAX_TRAINING_FILE_MB = 15;
export const TRAINING_FILE_ACCEPT = "image/*,application/pdf";

/**
 * Sube un adjunto (foto o PDF) al bucket privado y registra su fila.
 * La primera carpeta de la ruta debe ser el id del entrenamiento: de ahí
 * derivan los permisos de Storage (RLS).
 */
export async function uploadTrainingFile(
  trainingId: string,
  file: File
): Promise<{ error?: string }> {
  if (file.size > MAX_TRAINING_FILE_MB * 1024 * 1024) {
    return { error: `"${file.name}" supera ${MAX_TRAINING_FILE_MB} MB.` };
  }
  const supabase = createClient();
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${trainingId}/${Date.now()}-${safe}`;

  const { error: upErr } = await supabase.storage
    .from("training-files")
    .upload(path, file, { cacheControl: "3600" });
  if (upErr) return { error: upErr.message };

  return addTrainingFileAction({
    trainingId,
    path,
    name: file.name,
    mime: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });
}
