
'use server';

/**
 * @fileOverview Một luồng để nghiên cứu và tóm tắt thông tin về một công ty.
 *
 * - researchCompanyInformation - Một hàm nghiên cứu và tóm tắt thông tin công ty.
 * - ResearchCompanyInformationInput - Kiểu đầu vào cho hàm researchCompanyInformation.
 * - ResearchCompanyInformationOutput - Kiểu trả về cho hàm researchCompanyInformation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ResearchCompanyInformationInputSchema = z.object({
  stockCode: z.string().describe('Mã cổ phiếu của công ty cần nghiên cứu.'),
});

export type ResearchCompanyInformationInput = z.infer<typeof ResearchCompanyInformationInputSchema>;

const ResearchCompanyInformationOutputSchema = z.object({
  companySummary: z.string().describe('Tóm tắt thông tin công ty.'),
  recommendation: z.string().describe('Khuyến nghị về việc có nên mua cổ phiếu hay không (ví dụ: "nên mua", "không nên mua", "cân nhắc mua").'),
  suggestedPrice: z.number().optional().describe('Giá mua đề xuất nếu khuyến nghị là mua.'),
  stockCode: z.string().optional().describe('Mã cổ phiếu đã nghiên cứu.'), // Added to ensure it's part of the output schema
});

export type ResearchCompanyInformationOutput = z.infer<typeof ResearchCompanyInformationOutputSchema>;

export async function researchCompanyInformation(
  input: ResearchCompanyInformationInput
): Promise<ResearchCompanyInformationOutput> {
  const result = await researchCompanyInformationFlow(input);
  return { ...result, stockCode: input.stockCode }; // Ensure stockCode is in the final output
}

const researchCompanyPrompt = ai.definePrompt({
  name: 'researchCompanyPrompt', // Renamed from analyzeStockPrompt for clarity
  input: {schema: ResearchCompanyInformationInputSchema},
  output: {schema: ResearchCompanyInformationOutputSchema},
  prompt: `Bạn là một nhà phân tích tài chính chuyên về thị trường chứng khoán Việt Nam.
  Nhiệm vụ của bạn là nghiên cứu và tóm tắt thông tin về một công ty dựa trên mã cổ phiếu của công ty đó.
  Dựa trên nghiên cứu của bạn, hãy đưa ra khuyến nghị bằng tiếng Việt về việc có nên mua cổ phiếu hay không (ví dụ: "nên mua", "không nên mua", "cân nhắc mua").
  Nếu bạn khuyến nghị mua cổ phiếu, hãy cung cấp một mức giá mua đề xuất.

  Mã Cổ Phiếu: {{{stockCode}}}
  `,
});

const researchCompanyInformationFlow = ai.defineFlow(
  {
    name: 'researchCompanyInformationFlow',
    inputSchema: ResearchCompanyInformationInputSchema,
    outputSchema: ResearchCompanyInformationOutputSchema,
  },
  async input => {
    const {output} = await researchCompanyPrompt(input);
    return output!;
  }
);

    