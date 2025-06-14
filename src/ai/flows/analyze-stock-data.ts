// src/ai/flows/analyze-stock-data.ts
'use server';

/**
 * @fileOverview Analyzes Vietnamese stock data to provide investment recommendations.
 *
 * - analyzeStock - Analyzes stock data and provides a buy/no buy recommendation.
 * - AnalyzeStockInput - Input type for the analyzeStock function.
 * - AnalyzeStockOutput - Return type for the analyzeStock function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeStockInputSchema = z.object({
  stockCode: z.string().describe('The stock code to analyze (e.g., VCB).'),
});
export type AnalyzeStockInput = z.infer<typeof AnalyzeStockInputSchema>;

const AnalyzeStockOutputSchema = z.object({
  recommendation: z
    .enum(['buy', 'no buy'])
    .describe('Recommendation to buy or not buy the stock.'),
  suggestedPrice: z
    .number()
    .optional()
    .describe('Suggested purchase price if the recommendation is to buy.'),
  confidenceLevel: z
    .number()
    .describe('Confidence level (0-1) in the recommendation.'),
  analysis: z.string().describe('Detailed analysis of the stock data.'),
});
export type AnalyzeStockOutput = z.infer<typeof AnalyzeStockOutputSchema>;

export async function analyzeStock(input: AnalyzeStockInput): Promise<AnalyzeStockOutput> {
  return analyzeStockFlow(input);
}

const fetchStockData = ai.defineTool(
  {
    name: 'fetchStockData',
    description: 'Fetches financial reports, business results, and related data for a Vietnamese stock.',
    inputSchema: z.object({
      stockCode: z.string().describe('The stock code to fetch data for.'),
    }),
    outputSchema: z.string().describe('Financial data and news for the stock.'),
  },
  async input => {
    // In a real implementation, this would fetch data from a financial API or database.
    // This is just a placeholder implementation.
    console.log(`Fetching stock data for ${input.stockCode}`);
    return `[Placeholder] Financial data and news for ${input.stockCode}.  Insert real implementation to call external stock API`;
  }
);

const analyzeStockPrompt = ai.definePrompt({
  name: 'analyzeStockPrompt',
  tools: [fetchStockData],
  input: {schema: AnalyzeStockInputSchema},
  output: {schema: AnalyzeStockOutputSchema},
  prompt: `You are a financial analyst specializing in Vietnamese stocks.

  Analyze the provided stock data and provide a buy/no buy recommendation.
  If you recommend buying, provide a suggested purchase price.
  Also, provide a confidence level (0-1) for your recommendation.

  Stock Code: {{{stockCode}}}
  Stock Data: {{await fetchStockData stockCode=stockCode}}

  Based on the stock data, provide a recommendation, suggested purchase price (if applicable), confidence level, and a detailed analysis.
`,
});

const analyzeStockFlow = ai.defineFlow(
  {
    name: 'analyzeStockFlow',
    inputSchema: AnalyzeStockInputSchema,
    outputSchema: AnalyzeStockOutputSchema,
  },
  async input => {
    const {output} = await analyzeStockPrompt(input);
    return output!;
  }
);
