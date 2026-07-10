import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import FichaBody from "@/components/ficha/FichaBody";
import { getSessionProfile } from "@/lib/auth";

export const metadata = { title: "Mi ficha" };

export default async function MiFichaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const { profile } = await getSessionProfile();
  if (!profile) redirect("/login");

  return (
    <Screen title="Mi ficha" subtitle={profile.name || undefined}>
      <FichaBody profile={profile} activeTab={tab} basePath="/mi-ficha" self />
    </Screen>
  );
}
