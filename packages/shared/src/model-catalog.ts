import catalogJson from "./model-catalog.json";

export interface CatalogModel {
  id: string;
  provider: string;
  label: string;
  contextWindow: number;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  vision: boolean;
  tools: boolean;
}

export interface ModelCatalog {
  version: number;
  models: CatalogModel[];
}

export const MODEL_CATALOG: ModelCatalog = catalogJson;

export function findCatalogModel(modelId: string, provider: string): CatalogModel | null {
  return (
    MODEL_CATALOG.models.find((model) => model.id === modelId && model.provider === provider) ?? null
  );
}

export function catalogModelsForProvider(provider: string): CatalogModel[] {
  return MODEL_CATALOG.models.filter((model) => model.provider === provider);
}

export function openaiCatalogModels(): CatalogModel[] {
  return catalogModelsForProvider("openai");
}

export function estimateCostUsd(
  model: CatalogModel,
  tokensIn: number,
  tokensOut: number,
): string {
  const cost =
    (tokensIn / 1_000_000) * model.inputUsdPerMillion +
    (tokensOut / 1_000_000) * model.outputUsdPerMillion;
  return cost.toFixed(6);
}
