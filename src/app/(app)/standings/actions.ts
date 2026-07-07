"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff } from "@/lib/auth";

export type StandingsFormState = { error?: string };

function toInt(v: FormDataEntryValue | null): number {
  const n = Number.parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Lee los campos numéricos comunes de una fila de rival. */
function readStats(formData: FormData) {
  return {
    played: toInt(formData.get("played")),
    won: toInt(formData.get("won")),
    drawn: toInt(formData.get("drawn")),
    lost: toInt(formData.get("lost")),
    gf: toInt(formData.get("gf")),
    ga: toInt(formData.get("ga")),
  };
}

/** Añade una fila de rival a la clasificación de un equipo (RLS: can_manage_team). */
export async function addStandingsRowAction(
  _prev: StandingsFormState,
  formData: FormData
): Promise<StandingsFormState> {
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!teamId) return { error: "Equipo no válido." };
  if (!name) return { error: "Escribe el nombre del rival." };

  const { profile } = await getSessionProfile();
  if (!isStaff(profile)) return { error: "Sin permisos." };

  const supabase = await createClient();
  const { error } = await supabase.from("standings_rows").insert({
    team_id: teamId,
    name,
    ...readStats(formData),
  });
  if (error) return { error: error.message };
  revalidatePath("/standings");
  revalidatePath("/standings/edit");
  return {};
}

/** Edita una fila de rival. */
export async function editStandingsRowAction(
  _prev: StandingsFormState,
  formData: FormData
): Promise<StandingsFormState> {
  const id = String(formData.get("rowId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "Fila no válida." };
  if (!name) return { error: "Escribe el nombre del rival." };

  const { profile } = await getSessionProfile();
  if (!isStaff(profile)) return { error: "Sin permisos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("standings_rows")
    .update({ name, ...readStats(formData) })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/standings");
  revalidatePath("/standings/edit");
  return {};
}

/** Elimina una fila de rival. */
export async function deleteStandingsRowAction(formData: FormData): Promise<void> {
  const id = String(formData.get("rowId") ?? "");
  if (!id) return;
  const { profile } = await getSessionProfile();
  if (!isStaff(profile)) return;
  const supabase = await createClient();
  await supabase.from("standings_rows").delete().eq("id", id);
  revalidatePath("/standings");
  revalidatePath("/standings/edit");
}
