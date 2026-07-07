import { redirect } from "next/navigation";
import { getMyFichaId } from "@/lib/auth";

/**
 * Atajo "Mi ficha" del menú: resuelve la ficha del usuario y redirige. Así la
 * consulta solo ocurre al pulsar, no en cada navegación desde el layout.
 */
export default async function MiFichaPage() {
  const fichaId = await getMyFichaId();
  redirect(fichaId ? `/players/${fichaId}` : "/equipo");
}
