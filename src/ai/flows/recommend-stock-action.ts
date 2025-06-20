
// src/ai/flows/recommend-stock-action.ts
'use server';

/**
 * @fileOverview Đưa ra khuyến nghị mua hoặc không mua cho một cổ phiếu Việt Nam.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecommendStockInputSchema = z.object({
  stockCode: z.string().describe('Mã cổ phiếu cần khuyến nghị (ví dụ: VCB).'),
});
export type RecommendStockInput = z.infer<typeof RecommendStockInputSchema>;

const RecommendStockOutputSchema = z.object({
  recommendation: z.enum(['buy', 'no buy']).describe('Buy or no buy recommendation.'),
  rationale: z.string().describe('Short explanation for the recommendation.'),
  stockCode: z.string().optional().describe('Stock code that was analyzed.'),
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
  prompt: `Bạn là một chuyên gia phân tích cổ phiếu Việt Nam. Hãy phân tích mã cổ phiếu {{{stockCode}}} và đưa ra khuyến nghị \"buy\" hoặc \"no buy\" kèm theo lý do ngắn gọn.`,
});

const recommendStockFlow = ai.defineFlow(
  {
    name: 'recommendStockFlow',
    inputSchema: RecommendStockInputSchema,
    outputSchema: RecommendStockOutputSchema,
  },
  async (input) => {
    const { output } = await recommendStockPrompt(input);
    return output!;
  }
);
