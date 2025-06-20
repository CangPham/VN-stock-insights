
'use server';

/**
 * @fileOverview Một luồng để nghiên cứu và tóm tắt thông tin về một công ty.
 *
 * - researchCompanyInformation - Một hàm nghiên cứu và tóm tắt thông tin công ty.
 * - ResearchCompanyInformationInput - Kiểu đầu vào cho hàm researchCompanyInformation.
 * - ResearchCompanyInformationOutput - Kiểu trả về cho hàm researchCompanyInformation.
 */

import {ai, enhancedAI} from '@/ai/genkit';
import {z} from 'genkit';
import { StockAnalysisEngine } from '@/lib/analysis/stock-analysis-engine';

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
    try {
      // Try using enhanced AI system first
      const isEnhancedAvailable = await enhancedAI.isCurrentProviderAvailable();

      if (isEnhancedAvailable) {
        console.log('Using enhanced AI system for company research');

        const analysisEngine = new StockAnalysisEngine();
        const config = enhancedAI.getCurrentConfig().stockAnalysis;

        try {
          const companyInfo = await analysisEngine.getCompanyInfo(input.stockCode, config);
          const recommendation = await analysisEngine.getRecommendation(input.stockCode, config);

          // Convert to legacy format
          const legacyOutput: ResearchCompanyInformationOutput = {
            companySummary: `${companyInfo.companyName} (${companyInfo.stockCode})

Ngành: ${companyInfo.sector}
Lĩnh vực: ${companyInfo.industry}

Mô tả: ${companyInfo.description}

Mô hình kinh doanh: ${companyInfo.businessModel}

Lợi thế cạnh tranh:
${companyInfo.competitiveAdvantages.map(advantage => `- ${advantage}`).join('\n')}

Rủi ro chính:
${companyInfo.keyRisks.map(risk => `- ${risk}`).join('\n')}

Tin tức gần đây:
${companyInfo.recentNews.slice(0, 3).map(news =>
  `- ${news.title} (${news.source}, ${news.date.toLocaleDateString('vi-VN')})`
).join('\n')}

Thông tin được cập nhật từ các nguồn đáng tin cậy và hệ thống phân tích tự động.`,

            recommendation: recommendation.recommendation === 'buy' || recommendation.recommendation === 'strong_buy' ? 'nên mua' :
                           recommendation.recommendation === 'sell' || recommendation.recommendation === 'strong_sell' ? 'không nên mua' :
                           'cân nhắc mua',

            suggestedPrice: recommendation.targetPrice,
            stockCode: input.stockCode,
          };

          return legacyOutput;
        } catch (enhancedError) {
          console.warn('Enhanced company research failed, falling back to AI prompt:', enhancedError);
          // Fall through to original prompt-based analysis
        }
      }

      // Fallback to original Genkit flow
      console.log('Using original Genkit flow for company research');
      const {output} = await researchCompanyPrompt(input);
      return output!;

    } catch (error) {
      console.error('Company research flow failed:', error);

      // Ultimate fallback
      return {
        companySummary: `Không thể nghiên cứu thông tin công ty cho mã cổ phiếu ${input.stockCode} do lỗi hệ thống. Vui lòng thử lại sau.`,
        recommendation: 'không nên mua',
        stockCode: input.stockCode,
      };
    }
  }
);

    