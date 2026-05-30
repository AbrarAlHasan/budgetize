import { models, type LLMModelName } from 'react-native-executorch';

export type AiOnDeviceModelId =
  | 'llama3_2_1b_spinquant'
  | 'llama3_2_1b'
  | 'llama3_2_3b_spinquant'
  | 'qwen3_0_6b_quantized'
  | 'smollm2_135m_quantized'
  | 'phi_4_mini_4b_quantized';

export type AiModelTier = 'fast' | 'balanced' | 'quality';

export interface ExecuTorchModelConfig {
  modelName: LLMModelName;
  modelSource: string;
  tokenizerSource: string;
  tokenizerConfigSource: string;
}

export interface AiModelCatalogEntry {
  id: AiOnDeviceModelId;
  label: string;
  description: string;
  sizeLabel: string;
  tier: AiModelTier;
  huggingFaceUrl: string;
  resolve: () => ExecuTorchModelConfig;
}

export const DEFAULT_AI_ON_DEVICE_MODEL_ID: AiOnDeviceModelId =
  'llama3_2_1b_spinquant';

export const AI_MODEL_CATALOG: AiModelCatalogEntry[] = [
  {
    id: 'llama3_2_1b_spinquant',
    label: 'Llama 3.2 1B (Fast)',
    description: 'Best balance of speed and quality. Recommended default.',
    sizeLabel: '~500 MB',
    tier: 'fast',
    huggingFaceUrl: 'https://huggingface.co/software-mansion/react-native-executorch-llama-3.2',
    resolve: () => models.llm.llama3_2_1b(),
  },
  {
    id: 'llama3_2_1b',
    label: 'Llama 3.2 1B (Full)',
    description: 'Higher quality responses with a larger model file.',
    sizeLabel: '~1.2 GB',
    tier: 'balanced',
    huggingFaceUrl: 'https://huggingface.co/software-mansion/react-native-executorch-llama-3.2',
    resolve: () => models.llm.llama3_2_1b({ quant: false }),
  },
  {
    id: 'llama3_2_3b_spinquant',
    label: 'Llama 3.2 3B (Fast)',
    description: 'Stronger reasoning for complex finance questions.',
    sizeLabel: '~1.5 GB',
    tier: 'quality',
    huggingFaceUrl: 'https://huggingface.co/software-mansion/react-native-executorch-llama-3.2',
    resolve: () => models.llm.llama3_2_3b(),
  },
  {
    id: 'qwen3_0_6b_quantized',
    label: 'Qwen3 0.6B',
    description: 'Compact multilingual model with fast inference.',
    sizeLabel: '~400 MB',
    tier: 'fast',
    huggingFaceUrl: 'https://huggingface.co/software-mansion/react-native-executorch-qwen-3',
    resolve: () => models.llm.qwen3_0_6b(),
  },
  {
    id: 'smollm2_135m_quantized',
    label: 'SmolLM2 135M',
    description: 'Ultra-light model for quick categorization tasks.',
    sizeLabel: '~150 MB',
    tier: 'fast',
    huggingFaceUrl: 'https://huggingface.co/software-mansion/react-native-executorch-smollm2.1',
    resolve: () => models.llm.smollm2_1_135m(),
  },
  {
    id: 'phi_4_mini_4b_quantized',
    label: 'Phi-4 Mini 4B',
    description: 'High-quality answers on capable devices.',
    sizeLabel: '~2.5 GB',
    tier: 'quality',
    huggingFaceUrl: 'https://huggingface.co/software-mansion/react-native-executorch-phi-4',
    resolve: () => models.llm.phi_4_mini_4b(),
  },
];

export function getModelCatalogEntry(
  modelId: AiOnDeviceModelId
): AiModelCatalogEntry {
  const entry = AI_MODEL_CATALOG.find((item) => item.id === modelId);
  if (!entry) {
    return AI_MODEL_CATALOG[0];
  }
  return entry;
}

export function getModelSizeLabel(modelId: AiOnDeviceModelId): string {
  return getModelCatalogEntry(modelId).sizeLabel;
}

export function getModelSelectOptions(): Array<{ label: string; value: string }> {
  return AI_MODEL_CATALOG.map((entry) => ({
    label: `${entry.label} · ${entry.sizeLabel}`,
    value: entry.id,
  }));
}
