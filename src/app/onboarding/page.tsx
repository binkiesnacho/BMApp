import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import ClubForm from "./ClubForm";

export const metadata = { title: "Configura tu club" };

export default async function OnboardingPage() {
  const { user, profile } = await getSessionProfile();

  if (!user) redirect("/login");
  // Si ya tiene club, no hay onboarding pendiente.
  if (profile?.club_id) redirect("/");

  const canCreate = profile?.is_superadmin ?? false;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <div className="mb-2 text-4xl">🏟️</div>
        <h1 className="text-xl font-semibold text-label">
          {canCreate ? "Configura tu club" : "Únete a un club"}
        </h1>
        <p className="max-w-xs text-sm text-label-2">
          {canCreate
            ? "Crea el club del que serás administrador, o únete a uno con su código."
            : "Introduce el código que te ha facilitado el administrador de tu club."}
        </p>
      </div>
      <ClubForm canCreate={canCreate} />
    </main>
  );
}
