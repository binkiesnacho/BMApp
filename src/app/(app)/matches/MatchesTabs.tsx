"use client";

import { useRouter } from "next/navigation";
import Segmented from "@/components/ui/Segmented";

type Tab = "proximos" | "resultados";

export default function MatchesTabs({ value }: { value: Tab }) {
  const router = useRouter();
  return (
    <Segmented<Tab>
      value={value}
      onChange={(v) => router.push(`/matches?tab=${v}`)}
      options={[
        { value: "proximos", label: "Próximos" },
        { value: "resultados", label: "Resultados" },
      ]}
    />
  );
}
