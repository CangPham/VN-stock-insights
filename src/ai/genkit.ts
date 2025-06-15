import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { AIConfigManager } from '@/lib/ai/config-manager';
import { aiProviderManager } from '@/lib/ai/provider-factory';
import { AIProvider, AIModel } from '@/lib/ai/types';

// Initialize Genkit with Google AI (fallback)
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

// Enhanced AI interface that uses our multi-provider system
export class EnhancedAI {
  private configManager: AIConfigManager;

  constructor() {
    this.configManager = AIConfigManager.getInstance();
  }

  // Generate response using current configured provider
  async generateResponse(prompt: string): Promise<string> {
    try {
      return await aiProviderManager.generateResponse(prompt);
    } catch (error) {
      console.error('Enhanced AI generation failed, falling back to Genkit:', error);
      // Fallback to original Genkit
      const response = await ai.generate({
        prompt,
        model: 'googleai/gemini-2.0-flash',
      });
      return response.text;
    }
  }

  // Generate streaming response
  async* generateStreamResponse(prompt: string): AsyncGenerator<string> {
    try {
      yield* aiProviderManager.generateStreamResponse(prompt);
    } catch (error) {
      console.error('Enhanced AI streaming failed, falling back to Genkit:', error);
      // Fallback to original Genkit (non-streaming)
      const response = await ai.generate({
        prompt,
        model: 'googleai/gemini-2.0-flash',
      });
      yield response.text;
    }
  }

  // Generate with specific provider
  async generateWithProvider(prompt: string, provider: AIProvider, model?: AIModel): Promise<string> {
    try {
      return await aiProviderManager.generateResponseWithProvider(prompt, provider, model);
    } catch (error) {
      console.error(`Generation with ${provider} failed:`, error);
      throw error;
    }
  }

  // Web search capability
  async searchWeb(query: string): Promise<any[]> {
    try {
      return await aiProviderManager.searchWeb(query);
    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }

  // Get current configuration
  getCurrentConfig() {
    return this.configManager.getConfig();
  }

  // Check if current provider is available
  async isCurrentProviderAvailable(): Promise<boolean> {
    try {
      const status = await aiProviderManager.getProviderStatus();
      return status.validationResults.get(status.current) === true;
    } catch {
      return false;
    }
  }
}

// Export enhanced AI instance
export const enhancedAI = new EnhancedAI();
