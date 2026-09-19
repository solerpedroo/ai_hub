import { type JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SKILL_FOLDERS,
  type SkillDto,
  type SkillFolder,
  type SkillStep,
} from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const EMPTY_STEP: SkillStep = { id: "step-1", title: "", section: "" };

export function SkillsView({
  onRunSkill,
}: {
  onRunSkill: (input: { id: string; query: string }) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<SkillDto[]>([]);
  const [folder, setFolder] = useState<SkillFolder>("development");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preferredModel, setPreferredModel] = useState("");
  const [steps, setSteps] = useState<SkillStep[]>([EMPTY_STEP]);
  const [error, setError] = useState<string | null>(null);

  const selected = skills.find((item) => item.id === selectedId) ?? null;
  const folderSkills = skills.filter((item) => item.folder === folder);

  const reload = async (): Promise<void> => {
    setSkills(await window.hub.skills.list());
  };

  useEffect(() => {
    void reload().catch(() => setError(t("skills.error.generic")));
  }, [t]);

  const startNew = (): void => {
    setSelectedId(null);
    setTitle("");
    setDescription("");
    setPrompt("");
    setPreferredModel("");
    setSteps([{ ...EMPTY_STEP }]);
  };

  const selectSkill = (item: SkillDto): void => {
    setSelectedId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setPrompt(item.prompt);
    setPreferredModel(item.preferredModel ?? "");
    setSteps(item.steps.length > 0 ? item.steps : [{ ...EMPTY_STEP }]);
  };

  const saveSkill = async (): Promise<void> => {
    const nextSteps = steps
      .map((step, index) => ({
        id: step.id.trim() || `step-${index + 1}`,
        title: step.title.trim(),
        section: step.section.trim(),
      }))
      .filter((step) => step.title.length > 0 && step.section.length > 0);
    if (title.trim().length === 0 || description.trim().length === 0 || prompt.trim().length === 0) {
      setError(t("skills.error.save"));
      return;
    }
    try {
      if (selectedId) {
        const updated = await window.hub.skills.update({
          id: selectedId,
          folder,
          title: title.trim(),
          description: description.trim(),
          prompt: prompt.trim(),
          preferredModel: preferredModel.trim().length > 0 ? preferredModel.trim() : null,
          defaultMentions: selected?.defaultMentions ?? [],
          steps: nextSteps,
        });
        setSkills((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        selectSkill(updated);
      } else {
        const created = await window.hub.skills.create({
          folder,
          title: title.trim(),
          description: description.trim(),
          prompt: prompt.trim(),
          preferredModel: preferredModel.trim().length > 0 ? preferredModel.trim() : null,
          defaultMentions: [],
          steps: nextSteps,
        });
        setSkills((current) => [...current, created]);
        selectSkill(created);
      }
      setError(null);
    } catch {
      setError(t("skills.error.save"));
    }
  };

  return (
    <div className="flex h-full min-h-0" data-testid="skills-view">
      <aside className="flex w-64 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-2 py-1.5">
          <p className="text-[12px] font-medium">{t("skills.library")}</p>
          <Button type="button" size="sm" data-testid="skill-new" onClick={startNew}>
            {t("skills.new")}
          </Button>
        </div>
        <div className="flex gap-1 border-b px-2 py-1">
          {SKILL_FOLDERS.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={folder === item ? "default" : "ghost"}
              data-testid={`skill-folder-${item}`}
              onClick={() => setFolder(item)}
            >
              {t(`skills.folder.${item}`)}
            </Button>
          ))}
        </div>
        <ScrollArea className="flex-1">
          <ul className="p-1" data-testid="skill-list">
            {folderSkills.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`w-full rounded px-2 py-1 text-left text-[12px] ${
                    item.id === selectedId ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                  data-testid="skill-item"
                  data-factory={item.factoryId ?? ""}
                  onClick={() => selectSkill(item)}
                >
                  {item.factoryId ? t(`skills.factory.${item.factoryId}`) : item.title}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col p-2">
        <p className="mb-1 text-[12px] font-medium">{t("skills.editor")}</p>
        {error ? (
          <p className="mb-2 text-[12px] text-destructive" data-testid="skill-error">
            {error}
          </p>
        ) : null}
        <Input
          className="mb-1"
          data-testid="skill-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("skills.titlePlaceholder")}
        />
        <Input
          className="mb-1"
          data-testid="skill-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("skills.descriptionPlaceholder")}
        />
        <Input
          className="mb-1"
          data-testid="skill-model"
          value={preferredModel}
          onChange={(event) => setPreferredModel(event.target.value)}
          placeholder={t("skills.modelPlaceholder")}
        />
        <textarea
          className="mb-2 min-h-[120px] resize-none rounded border bg-background p-2 text-[12px]"
          data-testid="skill-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={t("skills.promptPlaceholder")}
        />
        <p className="mb-1 text-[12px] font-medium">{t("skills.steps")}</p>
        <div className="mb-2 flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
          {steps.map((step, index) => (
            <div key={`${step.id}-${index}`} className="rounded border p-2">
              <Input
                className="mb-1"
                data-testid="skill-step-title"
                value={step.title}
                onChange={(event) => {
                  const titleValue = event.target.value;
                  setSteps((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, title: titleValue } : row,
                    ),
                  );
                }}
                placeholder={t("skills.stepTitlePlaceholder")}
              />
              <textarea
                className="min-h-[72px] w-full resize-none rounded border bg-background p-2 text-[12px]"
                data-testid="skill-step-section"
                value={step.section}
                onChange={(event) => {
                  const section = event.target.value;
                  setSteps((current) =>
                    current.map((row, rowIndex) => (rowIndex === index ? { ...row, section } : row)),
                  );
                }}
                placeholder={t("skills.stepSectionPlaceholder")}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            data-testid="skill-add-step"
            onClick={() =>
              setSteps((current) => [
                ...current,
                { id: `step-${current.length + 1}`, title: "", section: "" },
              ])
            }
          >
            {t("skills.addStep")}
          </Button>
          <Button type="button" size="sm" data-testid="skill-save" onClick={() => void saveSkill()}>
            {t("skills.save")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            data-testid="skill-run"
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onRunSkill({
                  id: selected.id,
                  query: selected.factoryId ? t(`skills.factory.${selected.factoryId}`) : selected.title,
                });
              }
            }}
          >
            {t("skills.run")}
          </Button>
          {selectedId && !selected?.factoryId ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="skill-delete"
              onClick={() => {
                void window.hub.skills.remove({ id: selectedId }).then(() => {
                  setSkills((current) => current.filter((item) => item.id !== selectedId));
                  startNew();
                });
              }}
            >
              {t("skills.delete")}
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
