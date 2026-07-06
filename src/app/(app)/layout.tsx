import { redirect } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { getMyFichaId, getSessionProfile } from "@/lib/auth";

/** Shell principal (móvil-first, estilo iOS). Exige sesión y club configurado. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, profile } = await getSessionProfile();

  if (!user) redirect("/login");
  if (!profile?.club_id) redirect("/onboarding");

  const fichaId = await getMyFichaId();

  return (
    <div className="relative mx-auto min-h-dvh max-w-md">
      {children}
      <InstallPrompt />
      <BottomNav fichaHref={fichaId ? `/players/${fichaId}` : "/equipo"} />
    </div>
  );
}
