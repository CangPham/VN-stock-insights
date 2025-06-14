'use server';

/**
 * @fileOverview A flow to research and summarize information about a company.
 *
 * - researchCompanyInformation - A function that researches and summarizes company information.
 * - ResearchCompanyInformationInput - The input type for the researchCompanyInformation function.
 * - ResearchCompanyInformationOutput - The return type for the researchCompanyInformation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ResearchCompanyInformationInputSchema = z.object({
  stockCode: z.string().describe('The stock code of the company to research.'),
});

export type ResearchCompanyInformationInput = z.infer<typeof ResearchCompanyInformationInputSchema>;

const ResearchCompanyInformationOutputSchema = z.object({
  companySummary: z.string().describe('A summary of the company information.'),
  recommendation: z.string().describe('A recommendation on whether to buy the stock.'),
  suggestedPrice: z.number().optional().describe('The suggested purchase price if the recommendation is to buy.'),
});

export type ResearchCompanyInformationOutput = z.infer<typeof ResearchCompanyInformationOutputSchema>;

export async function researchCompanyInformation(
  input: ResearchCompanyInformationInput
): Promise<ResearchCompanyInformationOutput> {
  return researchCompanyInformationFlow(input);
}

const analyzeStockPrompt = ai.definePrompt({
  name: 'analyzeStockPrompt',
  input: {schema: ResearchCompanyInformationInputSchema},
  output: {schema: ResearchCompanyInformationOutputSchema},
  prompt: `You are a financial analyst specializing in the Vietnamese stock market.
  Your task is to research and summarize information about a company given its stock code.
  Based on your research, provide a recommendation on whether to buy the stock.
  If you recommend buying the stock, provide a suggested purchase price.

  Stock Code: {{{stockCode}}}
  `,
});

const researchCompanyInformationFlow = ai.defineFlow(
  {
    name: 'researchCompanyInformationFlow',
    inputSchema: ResearchCompanyInformationInputSchema,
    outputSchema: ResearchCompanyInformationOutputSchema,
  },
  async input => {
    const {output} = await analyzeStockPrompt(input);
    return output!;
  }
);
