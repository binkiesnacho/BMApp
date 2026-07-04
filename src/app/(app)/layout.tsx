import { redirect } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import { getSessionProfile } from "@/lib/auth";

/**
 * Shell principal de la app (móvil-first).
 * Protege el área privada: exige sesión y club configurado.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, profile } = await getSessionProfile();

  if (!user) redirect("/login");
  if (!profile?.club_id) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-24 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
