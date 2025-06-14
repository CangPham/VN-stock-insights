'use server';

import { analyzeStock, type AnalyzeStockInput, type AnalyzeStockOutput } from '@/ai/flows/analyze-stock-data';
import { researchCompanyInformation, type ResearchCompanyInformationInput, type ResearchCompanyInformationOutput } from '@/ai/flows/research-company-information';

export async function getStockAnalysis(input: AnalyzeStockInput): Promise<AnalyzeStockOutput> {
  // Add a small delay to simulate network latency for better UX testing
  // await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Validate stockCode (basic example, more robust validation might be needed)
  if (!input.stockCode || input.stockCode.trim().length < 2 || input.stockCode.trim().length > 10) {
    throw new Error('Invalid stock code provided. Must be 2-10 alphanumeric characters.');
  }
  
  try {
    const result = await analyzeStock(input);
    if (!result) {
        throw new Error('AI analysis returned no result.');
    }
    // Ensure stockCode is part of the output, if not already there from the flow
    return { ...result, stockCode: input.stockCode };
  } catch (error) {
    console.error(`Error in getStockAnalysis for ${input.stockCode}:`, error);
    throw new Error(`Failed to analyze stock ${input.stockCode}. The AI model might be unavailable or the stock code is not supported.`);
  }
}

export async function getCompanyInfo(input: ResearchCompanyInformationInput): Promise<ResearchCompanyInformationOutput> {
  // Add a small delay
  // await new Promise(resolve => setTimeout(resolve, 1000));

  if (!input.stockCode || input.stockCode.trim().length < 2 || input.stockCode.trim().length > 10) {
    throw new Error('Invalid stock code provided for company info. Must be 2-10 alphanumeric characters.');
  }

  try {
    const result = await researchCompanyInformation(input);
     if (!result) {
        throw new Error('AI company research returned no result.');
    }
    // Ensure stockCode is part of the output
    return { ...result, stockCode: input.stockCode };
  } catch (error) {
    console.error(`Error in getCompanyInfo for ${input.stockCode}:`, error);
    throw new Error(`Failed to research company ${input.stockCode}. The AI model might be unavailable or the stock code is not supported.`);
  }
}
