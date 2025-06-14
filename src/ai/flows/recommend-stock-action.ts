// RecommendStockAction.ts
'use server';

/**
 * @fileOverview Analyzes a Vietnamese stock and provides a buy/no buy recommendation.
 *
 * - recommendStockAction - Analyzes stock data and provides a recommendation.
 * - RecommendStockInput - Input type for recommendStockAction.
 * - RecommendStockOutput - Output type for recommendStockAction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendStockInputSchema = z.object({
  stockCode: z.string().describe('The stock code to analyze (e.g., VCB for Vietcombank).'),
});
export type RecommendStockInput = z.infer<typeof RecommendStockInputSchema>;

const RecommendStockOutputSchema = z.object({
  recommendation: z
    .union([
z.literal('buy'),
z.literal('no buy')
    ])
    .describe('The recommendation, either 