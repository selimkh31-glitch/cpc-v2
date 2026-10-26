"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { sensitiveCheckAction } from "@/features/auth/actions";

const FOREIGN_USER_ID = "00000000-0000-0000-0000-000000000000";

export function SpikeClient({ userId }: { userId: string }) {
  const t = useTranslations("spike");
  const [clientCheck, setClientCheck] = useState("—");
  const [ownStatus, setOwnStatus] = useState("—");
  const [foreignStatus, setForeignStatus] = useState("—");
  const [received, setReceived] = useState(0);
  const [sensitive, setSensitive] = useState("—");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const own = supabase
        .channel(`user:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "spike" }, () => setReceived((n) => n + 1))
        .subscribe((status) => setOwnStatus(status));
      const foreign = supabase
        .channel(`user:${FOREIGN_USER_ID}`, { config: { private: true } })
        .subscribe((status) => setForeignStatus(status));
      channels.push(own, foreign);
    })();
    return () => {
      cancelled = true;
      for (const c of channels) void supabase.removeChannel(c);
    };
  }, [userId]);

  async function runClientCheck() {
    const { data } = await getSupabaseBrowserClient().auth.getClaims();
    setClientCheck(data?.claims ? `valid:${data.claims.sub}:${data.claims.exp}` : "none");
  }

  return (
    <section className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2">
        <button type="button" onClick={runClientCheck} className="min-h-11 rounded-card border px-3">
          {t("clientCheck")}
        </button>
        <span data-testid="client-check">{clientCheck}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            // UX-02 : état « en cours » visible jusqu'à la réponse du serveur (jamais l'ancien résultat).
            setSensitive("pending");
            setSensitive(await sensitiveCheckAction());
          }}
          className="min-h-11 rounded-card border px-3"
        >
          {t("sensitiveAction")}
        </button>
        <span data-testid="sensitive-result">{sensitive}</span>
      </div>
      <p>
        {t("realtimeOwn")} <span data-testid="realtime-own-status">{ownStatus}</span>
      </p>
      <p>
        {t("realtimeForeign")} <span data-testid="realtime-foreign-status">{foreignStatus}</span>
      </p>
      <p>
        {t("realtimeReceived")} <span data-testid="realtime-received">{received}</span>
      </p>
    </section>
  );
}
