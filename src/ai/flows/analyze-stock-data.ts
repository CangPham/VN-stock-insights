
// src/ai/flows/analyze-stock-data.ts
'use server';

/**
 * @fileOverview Phân tích dữ liệu cổ phiếu Việt Nam để đưa ra khuyến nghị đầu tư, sử dụng dữ liệu thời gian thực.
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
  stockCode: z.string().optional().describe('Mã cổ phiếu đã phân tích.'),
});
export type AnalyzeStockOutput = z.infer<typeof AnalyzeStockOutputSchema>;

export async function analyzeStock(input: AnalyzeStockInput): Promise<AnalyzeStockOutput> {
  const result = await analyzeStockFlow(input);
  return { ...result, stockCode: input.stockCode };
}

const fetchStockData = ai.defineTool(
  {
    name: 'fetchStockData',
    description: 'Lấy báo cáo tài chính, kết quả kinh doanh, tin tức và dữ liệu liên quan theo thời gian thực, cập nhật đến ngày hôm nay cho một cổ phiếu Việt Nam.',
    inputSchema: z.object({
      stockCode: z.string().describe('Mã cổ phiếu để lấy dữ liệu.'),
    }),
    outputSchema: z.string().describe('Dữ liệu tài chính, tin tức cập nhật và các dữ liệu liên quan theo thời gian thực cho cổ phiếu.'),
  },
  async input => {
    const currentDate = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    console.log(`Đang lấy dữ liệu cổ phiếu ${input.stockCode} cập nhật đến ${currentDate}`);
    return `[Dữ liệu giữ chỗ] Dữ liệu tài chính, tin tức cập nhật đến ngày ${currentDate} và các dữ liệu liên quan theo thời gian thực cho ${input.stockCode}. Chèn triển khai thực tế để gọi API chứng khoán bên ngoài.`;
  }
);

const analyzeStockPrompt = ai.definePrompt({
  name: 'analyzeStockPrompt',
  tools: [fetchStockData],
  input: {schema: z.object({ // Schema cho input của prompt, bao gồm cả currentDate
    stockCode: AnalyzeStockInputSchema.shape.stockCode,
    currentDate: z.string().describe('Ngày hiện tại để tham chiếu cho dữ liệu mới nhất.'),
  })},
  output: {schema: AnalyzeStockOutputSchema},
  prompt: `Bạn là một nhà phân tích tài chính chuyên về cổ phiếu Việt Nam.
Nhiệm vụ của bạn là phân tích một cổ phiếu dựa trên mã cổ phiếu của nó, sử dụng dữ liệu cập nhật đến ngày hôm nay: {{{currentDate}}}.
Để làm điều này, bạn BẮT BUỘC phải sử dụng công cụ 'fetchStockData' để lấy các báo cáo tài chính mới nhất, kết quả kinh doanh, tin tức và dữ liệu liên quan theo thời gian thực cho mã cổ phiếu đã cho.

Mã Cổ Phiếu: {{{stockCode}}}

Sau khi lấy dữ liệu bằng công cụ 'fetchStockData' (dữ liệu này bao gồm thông tin cập nhật đến {{{currentDate}}}), hãy phân tích kỹ lưỡng.
Dựa trên phân tích của bạn về dữ liệu đã lấy (bao gồm tin tức và báo cáo mới nhất đến hôm nay), hãy cung cấp:
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
  async (input: AnalyzeStockInput) => {
    const currentDate = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const {output} = await analyzeStockPrompt({...input, currentDate});
    return output!;
  }
);
