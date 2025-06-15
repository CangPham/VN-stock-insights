'use server';

/**
 * Recommend stock action: analyze a Vietnamese stock and decide whether to buy.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecommendStockInputSchema = z.object({
  stockCode: z.string().describe('The stock code to analyze (e.g., VCB for Vietcombank).')
});
export type RecommendStockInput = z.infer<typeof RecommendStockInputSchema>;

const RecommendStockOutputSchema = z.object({
  recommendation: z.enum(['buy', 'no buy']).describe('The recommendation, either buy or no buy.'),
  confidence: z.number().describe('Confidence level between 0 and 1'),
  suggestedPrice: z.number().optional().describe('Suggested buy price if applicable'),
  analysis: z.string().describe('Short analysis of the stock'),
  stockCode: z.string().optional().describe('Analyzed stock code')
});
export type RecommendStockOutput = z.infer<typeof RecommendStockOutputSchema>;

export async function recommendStockAction(
  input: RecommendStockInput
): Promise<RecommendStockOutput> {
  const result = await recommendStockFlow(input);
  return { ...result, stockCode: input.stockCode };
}

const recommendStockPrompt = ai.definePrompt({
  name: 'recommendStockPrompt',
  input: { schema: RecommendStockInputSchema },
  output: { schema: RecommendStockOutputSchema },
  prompt: `You are an expert Vietnamese stock analyst. Analyze the stock with code {{{stockCode}}} and return a clear 'buy' or 'no buy' recommendation. Provide a confidence level from 0 to 1. If you recommend buying, suggest an appropriate purchase price. Give a short explanation in Vietnamese.`
});

const recommendStockFlow = ai.defineFlow(
  {
    name: 'recommendStockFlow',
    inputSchema: RecommendStockInputSchema,
    outputSchema: RecommendStockOutputSchema,
  },
  async (input: RecommendStockInput) => {
    const { output } = await recommendStockPrompt(input);
    return output!;
  }
);
