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
  recommendation: z.enum(['buy', 'no buy']).describe('Khuyến nghị mua hoặc không mua.'),
  reason: z.string().describe('Giải thích ngắn gọn lý do khuyến nghị.'),
});
export type RecommendStockOutput = z.infer<typeof RecommendStockOutputSchema>;

export async function recommendStockAction(
  input: RecommendStockInput,
): Promise<RecommendStockOutput> {
  const prompt = ai`
    Bạn là chuyên gia phân tích cổ phiếu Việt Nam. 
    Hãy đưa ra khuyến nghị mua hoặc không mua cho mã cổ phiếu {{stockCode}} cùng lý do ngắn gọn.
  `;
  const result = await prompt.generate({ stockCode: input.stockCode });
  const recommendation = result.text.toLowerCase().includes('mua') ? 'buy' : 'no buy';
  return { recommendation, reason: result.text };
}
