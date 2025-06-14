
// src/ai/flows/analyze-stock-data.ts
'use server';

/**
 * @fileOverview Phân tích dữ liệu cổ phiếu Việt Nam để đưa ra khuyến nghị đầu tư.
 *
 * - analyzeStock - Phân tích dữ liệu cổ phiếu và đưa ra khuyến nghị mua/không mua.
 * - AnalyzeStockInput - Kiểu đầu vào cho hàm analyzeStock.
 * - AnalyzeStockOutput - Kiểu trả về cho hàm analyzeStock.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeStockInputSchema = z.object({
  stockCode: z.string().describe('Mã cổ phiếu cần phân tích (ví dụ: VCB).'),
});
export type AnalyzeStockInput = z.infer<typeof AnalyzeStockInputSchema>;

const AnalyzeStockOutputSchema = z.object({
  recommendation: z
    .enum(['mua', 'không mua'])
    .describe('Khuyến nghị mua hoặc không mua cổ phiếu.'),
  suggestedPrice: z
    .number()
    .optional()
    .describe('Giá mua đề xuất nếu khuyến nghị là mua.'),
  confidenceLevel: z
    .number()
    .describe('Mức độ tin cậy (0-1) vào khuyến nghị.'),
  analysis: z.string().describe('Phân tích chi tiết dữ liệu cổ phiếu.'),
  stockCode: z.string().optional().describe('Mã cổ phiếu đã phân tích.'), // Added to ensure it's part of the output schema
});
export type AnalyzeStockOutput = z.infer<typeof AnalyzeStockOutputSchema>;

export async function analyzeStock(input: AnalyzeStockInput): Promise<AnalyzeStockOutput> {
  const result = await analyzeStockFlow(input);
  return { ...result, stockCode: input.stockCode }; // Ensure stockCode is in the final output
}

const fetchStockData = ai.defineTool(
  {
    name: 'fetchStockData',
    description: 'Lấy báo cáo tài chính, kết quả kinh doanh và dữ liệu liên quan cho một cổ phiếu Việt Nam.',
    inputSchema: z.object({
      stockCode: z.string().describe('Mã cổ phiếu để lấy dữ liệu.'),
    }),
    outputSchema: z.string().describe('Dữ liệu tài chính và tin tức cho cổ phiếu.'),
  },
  async input => {
    console.log(`Đang lấy dữ liệu cổ phiếu cho ${input.stockCode}`);
    return `[Dữ liệu giữ chỗ] Dữ liệu tài chính và tin tức cho ${input.stockCode}. Chèn triển khai thực tế để gọi API chứng khoán bên ngoài`;
  }
);

const analyzeStockPrompt = ai.definePrompt({
  name: 'analyzeStockPrompt',
  tools: [fetchStockData],
  input: {schema: AnalyzeStockInputSchema},
  output: {schema: AnalyzeStockOutputSchema},
  prompt: `Bạn là một nhà phân tích tài chính chuyên về cổ phiếu Việt Nam.
Nhiệm vụ của bạn là phân tích một cổ phiếu dựa trên mã cổ phiếu của nó.
Để làm điều này, bạn BẮT BUỘC phải sử dụng công cụ 'fetchStockData' để lấy các báo cáo tài chính mới nhất, kết quả kinh doanh và dữ liệu liên quan cho mã cổ phiếu đã cho.

Mã Cổ Phiếu: {{{stockCode}}}

Sau khi lấy dữ liệu bằng công cụ 'fetchStockData', hãy phân tích kỹ lưỡng.
Dựa trên phân tích của bạn về dữ liệu đã lấy, hãy cung cấp:
1. Khuyến nghị "mua" hoặc "không mua" rõ ràng (lưu ý: giá trị trả về trong trường 'recommendation' phải là "mua" hoặc "không mua" theo đúng schema).
2. Nếu khuyến nghị là "mua", hãy đề xuất một mức giá mua.
3. Mức độ tin cậy (từ 0.0 đến 1.0) cho khuyến nghị của bạn.
4. Một phân tích chi tiết giải thích lý do của bạn.
Đảm bảo kết quả đầu ra của bạn tuân thủ nghiêm ngặt schema đã định nghĩa.
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

    