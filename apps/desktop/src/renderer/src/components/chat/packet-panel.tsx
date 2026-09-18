import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ContextPacketDto, PacketPreviewResult, PacketPrivacyMode } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PacketPanel({
  packetPreview,
  packets,
  projectId,
  appliedPacketId,
  privacyMode,
  busy,
  onPrivacyMode,
  onCompile,
  onExport,
  onImport,
  onApply,
  onClear,
}: {
  packetPreview: PacketPreviewResult | null;
  packets: ContextPacketDto[];
  projectId: string | null;
  appliedPacketId: string | null;
  privacyMode: PacketPrivacyMode;
  busy: boolean;
  onPrivacyMode: (value: PacketPrivacyMode) => void;
  onCompile: () => Promise<void>;
  onExport: (packetId: string) => Promise<void>;
  onImport: () => Promise<void>;
  onApply: (packetId: string) => Promise<void>;
  onClear: () => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const canMutate = projectId !== null && !busy;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="packet-open"
        disabled={projectId === null && !packetPreview}
        onClick={() => setOpen(true)}
      >
        {t("workspace.packet.open")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="packet-dialog" className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("workspace.packet.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-[13px]">
            {packetPreview ? (
              <>
                <p data-testid="packet-destination">
                  {t("workspace.packet.destination", {
                    provider: packetPreview.destinationProvider,
                    model: packetPreview.destinationModel,
                    window: packetPreview.contextWindow,
                    n: packetPreview.tokenEstimate,
                  })}
                </p>
                {appliedPacketId ? (
                  <p data-testid="packet-applied" className="text-muted-foreground">
                    {t("workspace.packet.applied")}
                  </p>
                ) : null}
                <label className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t("workspace.packet.privacy")}</span>
                  <select
                    className="h-8 rounded-md border bg-background px-2"
                    value={appliedPacketId ? packetPreview.privacyMode : privacyMode}
                    disabled={Boolean(appliedPacketId) || busy}
                    data-testid="packet-privacy"
                    aria-label={t("workspace.packet.privacy")}
                    onChange={(event) => onPrivacyMode(event.target.value === "strict" ? "strict" : "standard")}
                  >
                    <option value="standard">{t("workspace.packet.privacy.standard")}</option>
                    <option value="strict">{t("workspace.packet.privacy.strict")}</option>
                  </select>
                </label>
                <section>
                  <h3 className="mb-1 text-[12px] font-medium">{t("workspace.packet.included")}</h3>
                  <ul className="flex flex-col gap-1" data-testid="packet-included">
                    {packetPreview.included.length === 0 ? (
                      <li className="text-muted-foreground">{t("workspace.packet.empty")}</li>
                    ) : (
                      packetPreview.included.map((slice, index) => (
                        <li key={`${slice.kind}-${slice.id ?? index}`} className="rounded-md border px-2 py-1">
                          {t(`workspace.packet.kind.${slice.kind}`)} · {slice.label} · ~{slice.tokens}
                        </li>
                      ))
                    )}
                  </ul>
                </section>
                <section>
                  <h3 className="mb-1 text-[12px] font-medium">{t("workspace.packet.omitted")}</h3>
                  <ul className="flex flex-col gap-1" data-testid="packet-omitted">
                    {packetPreview.omitted.length === 0 ? (
                      <li className="text-muted-foreground">{t("workspace.packet.empty")}</li>
                    ) : (
                      packetPreview.omitted.map((slice, index) => (
                        <li key={`${slice.kind}-${slice.id ?? index}`} className="rounded-md border px-2 py-1">
                          {t(`workspace.packet.kind.${slice.kind}`)} · {slice.label} · ~{slice.tokens}
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </>
            ) : (
              <p className="text-muted-foreground">{t("workspace.packet.needPreview")}</p>
            )}
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                disabled={!canMutate || !packetPreview}
                data-testid="packet-compile"
                onClick={() => {
                  void onCompile();
                }}
              >
                {t("workspace.packet.save")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canMutate}
                data-testid="packet-import"
                onClick={() => {
                  void onImport();
                }}
              >
                {t("workspace.packet.import")}
              </Button>
              {appliedPacketId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  data-testid="packet-clear"
                  onClick={() => {
                    void onClear();
                  }}
                >
                  {t("workspace.packet.clear")}
                </Button>
              ) : null}
            </div>
            <section>
              <h3 className="mb-1 text-[12px] font-medium">{t("workspace.packet.saved")}</h3>
              {packets.length === 0 ? (
                <p className="text-muted-foreground">{t("workspace.packet.none")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {packets.map((packet) => (
                    <li key={packet.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1">
                      <span>
                        {packet.origin.conversationLabel || t("workspace.packet.untitled")} · ~
                        {packet.tokenEstimate ?? 0} · {t(`workspace.packet.privacy.${packet.privacyMode}`)}
                      </span>
                      <span className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!canMutate}
                          data-testid="packet-export"
                          onClick={() => {
                            void onExport(packet.id);
                          }}
                        >
                          {t("workspace.packet.export")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={appliedPacketId === packet.id ? "secondary" : "outline"}
                          disabled={busy}
                          data-testid="packet-apply"
                          onClick={() => {
                            void onApply(packet.id);
                          }}
                        >
                          {appliedPacketId === packet.id ? t("workspace.packet.using") : t("workspace.packet.apply")}
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
