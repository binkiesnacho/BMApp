import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { getMyClub, getSessionProfile, canAdminister } from "@/lib/auth";
import RenameClubForm from "../RenameClubForm";
import LogoUploader from "../LogoUploader";

export const metadata = { title: "Club" };

export default async function AdminClubPage() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) redirect("/onboarding");
  if (!canAdminister(profile)) redirect("/admin");
  const club = await getMyClub();
  if (!club) redirect("/admin");

  return (
    <Screen title="Club" back="/admin">
      <section className="space-y-4 rounded-2xl bg-surface p-4">
        <div>
          <p className="ios-section-caption mb-2">Logo</p>
          <LogoUploader clubId={club.id} clubName={club.name} logoUrl={club.logo_url} />
        </div>
        <div>
          <p className="ios-section-caption mb-2">Nombre</p>
          <RenameClubForm currentName={club.name} />
        </div>
      </section>
    </Screen>
  );
}
