/**
 * @fileOverview Default AI Model Configurations
 * Cấu hình mặc định cho các mô hình AI được hỗ trợ
 */

import { AIProvider, AIModel, AIModelConfig } from './types';

// Cấu hình mặc định cho các mô hình Google Gemini
export const GEMINI_MODEL_CONFIGS: Record<string, AIModelConfig> = {
  [AIModel.GEMINI_2_0_FLASH]: {
    provider: AIProvider.GOOGLE_GEMINI,
    model: AIModel.GEMINI_2_0_FLASH,
    displayName: 'Gemini 2.0 Flash',
    description: 'Mô hình Gemini mới nhất với tốc độ cao và khả năng đa phương tiện',
    maxTokens: 8192,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsWebSearch: false,
    costPer1kTokens: 0.075, // USD per 1k tokens (example pricing)
  },
  [AIModel.GEMINI_1_5_PRO]: {
    provider: AIProvider.GOOGLE_GEMINI,
    model: AIModel.GEMINI_1_5_PRO,
    displayName: 'Gemini 1.5 Pro',
    description: 'Mô hình Gemini chuyên nghiệp với khả năng phân tích sâu',
    maxTokens: 32768,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsWebSearch: false,
    costPer1kTokens: 0.35,
  },
  [AIModel.GEMINI_1_5_FLASH]: {
    provider: AIProvider.GOOGLE_GEMINI,
    model: AIModel.GEMINI_1_5_FLASH,
    displayName: 'Gemini 1.5 Flash',
    description: 'Mô hình Gemini tốc độ cao với chi phí thấp',
    maxTokens: 8192,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsWebSearch: false,
    costPer1kTokens: 0.075,
  },
};

// Cấu hình mặc định cho các mô hình OpenAI
export const OPENAI_MODEL_CONFIGS: Record<string, AIModelConfig> = {
  [AIModel.GPT_4O]: {
    provider: AIProvider.OPENAI_GPT,
    model: AIModel.GPT_4O,
    displayName: 'GPT-4o',
    description: 'Mô hình GPT-4 Omni với khả năng đa phương tiện',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsWebSearch: false,
    costPer1kTokens: 5.0, // Input tokens
  },
  [AIModel.GPT_4O_MINI]: {
    provider: AIProvider.OPENAI_GPT,
    model: AIModel.GPT_4O_MINI,
    displayName: 'GPT-4o Mini',
    description: 'Phiên bản nhỏ gọn của GPT-4o với chi phí thấp hơn',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsWebSearch: false,
    costPer1kTokens: 0.15,
  },
  [AIModel.GPT_4_TURBO]: {
    provider: AIProvider.OPENAI_GPT,
    model: AIModel.GPT_4_TURBO,
    displayName: 'GPT-4 Turbo',
    description: 'Mô hình GPT-4 Turbo với hiệu suất cao',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsWebSearch: false,
    costPer1kTokens: 10.0,
  },
};

// Cấu hình mặc định cho các mô hình Perplexity
export const PERPLEXITY_MODEL_CONFIGS: Record<string, AIModelConfig> = {
  [AIModel.PERPLEXITY_SONAR_LARGE]: {
    provider: AIProvider.PERPLEXITY,
    model: AIModel.PERPLEXITY_SONAR_LARGE,
    displayName: 'Sonar Large Online',
    description: 'Mô hình Perplexity lớn với khả năng tìm kiếm web thời gian thực',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsWebSearch: true,
    costPer1kTokens: 5.0,
  },
  [AIModel.PERPLEXITY_SONAR_SMALL]: {
    provider: AIProvider.PERPLEXITY,
    model: AIModel.PERPLEXITY_SONAR_SMALL,
    displayName: 'Sonar Small Online',
    description: 'Mô hình Perplexity nhỏ gọn với khả năng tìm kiếm web',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsWebSearch: true,
    costPer1kTokens: 1.0,
  },
};

// Cấu hình mặc định cho các mô hình Anthropic Claude
export const CLAUDE_MODEL_CONFIGS: Record<string, AIModelConfig> = {
  [AIModel.CLAUDE_3_5_SONNET]: {
    provider: AIProvider.ANTHROPIC_CLAUDE,
    model: AIModel.CLAUDE_3_5_SONNET,
    displayName: 'Claude 3.5 Sonnet',
    description: 'Mô hình Claude 3.5 Sonnet với khả năng phân tích xuất sắc',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsWebSearch: false,
    costPer1kTokens: 3.0,
  },
  [AIModel.CLAUDE_3_HAIKU]: {
    provider: AIProvider.ANTHROPIC_CLAUDE,
    model: AIModel.CLAUDE_3_HAIKU,
    displayName: 'Claude 3 Haiku',
    description: 'Mô hình Claude 3 Haiku nhanh và hiệu quả',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsWebSearch: false,
    costPer1kTokens: 0.25,
  },
};

// Tổng hợp tất cả cấu hình mô hình
export const ALL_MODEL_CONFIGS: Record<string, AIModelConfig> = {
  ...GEMINI_MODEL_CONFIGS,
  ...OPENAI_MODEL_CONFIGS,
  ...PERPLEXITY_MODEL_CONFIGS,
  ...CLAUDE_MODEL_CONFIGS,
};

// Mapping từ provider đến các mô hình được hỗ trợ
export const PROVIDER_MODELS: Record<AIProvider, AIModel[]> = {
  [AIProvider.GOOGLE_GEMINI]: [
    AIModel.GEMINI_2_0_FLASH,
    AIModel.GEMINI_1_5_PRO,
    AIModel.GEMINI_1_5_FLASH,
  ],
  [AIProvider.OPENAI_GPT]: [
    AIModel.GPT_4O,
    AIModel.GPT_4O_MINI,
    AIModel.GPT_4_TURBO,
  ],
  [AIProvider.PERPLEXITY]: [
    AIModel.PERPLEXITY_SONAR_LARGE,
    AIModel.PERPLEXITY_SONAR_SMALL,
  ],
  [AIProvider.ANTHROPIC_CLAUDE]: [
    AIModel.CLAUDE_3_5_SONNET,
    AIModel.CLAUDE_3_HAIKU,
  ],
};

// Mô hình mặc định cho mỗi provider
export const DEFAULT_MODELS: Record<AIProvider, AIModel> = {
  [AIProvider.GOOGLE_GEMINI]: AIModel.GEMINI_2_0_FLASH,
  [AIProvider.OPENAI_GPT]: AIModel.GPT_4O_MINI,
  [AIProvider.PERPLEXITY]: AIModel.PERPLEXITY_SONAR_SMALL,
  [AIProvider.ANTHROPIC_CLAUDE]: AIModel.CLAUDE_3_5_SONNET,
};

// Hàm helper để lấy cấu hình mô hình
export function getModelConfig(model: AIModel): AIModelConfig | undefined {
  return ALL_MODEL_CONFIGS[model];
}

// Hàm helper để lấy các mô hình của một provider
export function getProviderModels(provider: AIProvider): AIModel[] {
  return PROVIDER_MODELS[provider] || [];
}

// Hàm helper để lấy mô hình mặc định của một provider
export function getDefaultModel(provider: AIProvider): AIModel {
  return DEFAULT_MODELS[provider];
}

// Hàm helper để kiểm tra xem mô hình có hỗ trợ tính năng nào không
export function modelSupportsFeature(
  model: AIModel,
  feature: 'streaming' | 'tools' | 'vision' | 'webSearch'
): boolean {
  const config = getModelConfig(model);
  if (!config) return false;
  
  switch (feature) {
    case 'streaming':
      return config.supportsStreaming;
    case 'tools':
      return config.supportsTools;
    case 'vision':
      return config.supportsVision;
    case 'webSearch':
      return config.supportsWebSearch;
    default:
      return false;
  }
}

// Cấu hình mặc định cho phân tích cổ phiếu theo từng mô hình
export const MODEL_ANALYSIS_CONFIGS = {
  // Mô hình có khả năng tìm kiếm web tốt cho phân tích thời gian thực
  webSearchOptimized: [
    AIModel.PERPLEXITY_SONAR_LARGE,
    AIModel.PERPLEXITY_SONAR_SMALL,
  ],
  
  // Mô hình tốt cho phân tích kỹ thuật chi tiết
  technicalAnalysisOptimized: [
    AIModel.GEMINI_1_5_PRO,
    AIModel.GPT_4O,
    AIModel.CLAUDE_3_5_SONNET,
  ],
  
  // Mô hình hiệu quả về chi phí cho phân tích cơ bản
  costEffective: [
    AIModel.GEMINI_1_5_FLASH,
    AIModel.GPT_4O_MINI,
    AIModel.CLAUDE_3_HAIKU,
  ],
  
  // Mô hình tốt cho phân tích tình cảm
  sentimentAnalysisOptimized: [
    AIModel.CLAUDE_3_5_SONNET,
    AIModel.GPT_4O,
    AIModel.GEMINI_1_5_PRO,
  ],
};
