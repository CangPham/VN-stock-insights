
'use server';

import { analyzeStock, type AnalyzeStockInput, type AnalyzeStockOutput } from '@/ai/flows/analyze-stock-data';
import { researchCompanyInformation, type ResearchCompanyInformationInput, type ResearchCompanyInformationOutput } from '@/ai/flows/research-company-information';

export async function getStockAnalysis(input: AnalyzeStockInput): Promise<AnalyzeStockOutput> {
  // Add a small delay to simulate network latency for better UX testing
  // await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Validate stockCode (basic example, more robust validation might be needed)
  if (!input.stockCode || input.stockCode.trim().length < 2 || input.stockCode.trim().length > 10) {
    throw new Error('Mã cổ phiếu không hợp lệ. Phải là 2-10 ký tự chữ và số.');
  }
  
  try {
    const result = await analyzeStock(input);
    if (!result) {
        throw new Error('Phân tích AI không trả về kết quả.');
    }
    // Ensure stockCode is part of the output, if not already there from the flow
    return { ...result, stockCode: input.stockCode };
  } catch (error) {
    console.error(`Lỗi trong getStockAnalysis cho ${input.stockCode}:`, error);
    throw new Error(`Không thể phân tích cổ phiếu ${input.stockCode}. Mô hình AI có thể không khả dụng hoặc mã cổ phiếu không được hỗ trợ.`);
  }
}

export async function getCompanyInfo(input: ResearchCompanyInformationInput): Promise<ResearchCompanyInformationOutput> {
  // Add a small delay
  // await new Promise(resolve => setTimeout(resolve, 1000));

  if (!input.stockCode || input.stockCode.trim().length < 2 || input.stockCode.trim().length > 10) {
    throw new Error('Mã cổ phiếu không hợp lệ để lấy thông tin công ty. Phải là 2-10 ký tự chữ và số.');
  }

  try {
    const result = await researchCompanyInformation(input);
     if (!result) {
        throw new Error('Nghiên cứu công ty AI không trả về kết quả.');
    }
    // Ensure stockCode is part of the output
    return { ...result, stockCode: input.stockCode };
  } catch (error) {
    console.error(`Lỗi trong getCompanyInfo cho ${input.stockCode}:`, error);
    throw new Error(`Không thể nghiên cứu công ty ${input.stockCode}. Mô hình AI có thể không khả dụng hoặc mã cổ phiếu không được hỗ trợ.`);
  }
}

    