
// src/ai/flows/analyze-stock-data.ts
'use server';

/**
 * @fileOverview Phân tích dữ liệu cổ phiếu Việt Nam để đưa ra khuyến nghị đầu tư, sử dụng dữ liệu thời gian thực và có trích dẫn nguồn.
 *
 * - analyzeStock - Phân tích dữ liệu cổ phiếu và đưa ra khuyến nghị mua/không mua.
 * - AnalyzeStockInput - Kiểu đầu vào cho hàm analyzeStock.
 * - AnalyzeStockOutput - Kiểu trả về cho hàm analyzeStock.
 */

import {ai, enhancedAI} from '@/ai/genkit';
import {z} from 'genkit';
import { StockAnalysisEngine } from '@/lib/analysis/stock-analysis-engine';
import { FinancialSearchEngine } from '@/lib/search/financial-search-engine';

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
  analysis: z.string().describe('Phân tích chi tiết dữ liệu cổ phiếu, bao gồm trích dẫn nguồn dữ liệu đã sử dụng.'),
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
    description: 'Lấy báo cáo tài chính, kết quả kinh doanh, tin tức và dữ liệu liên quan theo thời gian thực, cập nhật đến ngày hôm nay cho một cổ phiếu Việt Nam. Quan trọng: Kết quả phải bao gồm nguồn trích dẫn cho dữ liệu được cung cấp.',
    inputSchema: z.object({
      stockCode: z.string().describe('Mã cổ phiếu để lấy dữ liệu.'),
    }),
    outputSchema: z.string().describe('Dữ liệu tài chính, tin tức cập nhật và các dữ liệu liên quan theo thời gian thực cho cổ phiếu, dưới dạng chuỗi JSON. Chuỗi JSON này BẮT BUỘC phải bao gồm một trường "source" ghi rõ nguồn dữ liệu.'),
  },
  async (input) => {
    const currentDate = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    console.log(`Đang lấy dữ liệu cổ phiếu ${input.stockCode} cập nhật đến ${currentDate} (bao gồm nguồn trích dẫn)`);

    try {
      const searchEngine = new FinancialSearchEngine();

      // Search for financial news
      const financialNews = await searchEngine.searchFinancialNews({
        stockCode: input.stockCode,
        timeframe: '7d',
      });

      // Search for real-time news
      const realtimeNews = await searchEngine.searchRealTimeNews(input.stockCode);

      // Search for company info
      const companyData = await searchEngine.searchCompanyInfo(input.stockCode);

      // Compile real data
      const realData = {
        financialReportSummary: `Thông tin tài chính gần nhất cho ${input.stockCode} từ các nguồn tin cậy.`,
        latestNews: realtimeNews.slice(0, 5).map(news => ({
          title: news.title,
          snippet: news.snippet,
          source: news.source,
          url: news.url,
          date: news.date,
        })),
        marketData: `Dữ liệu thị trường cập nhật cho ${input.stockCode}.`,
        financialNews: financialNews.slice(0, 10).map(news => ({
          title: news.title,
          snippet: news.snippet,
          source: news.source,
          url: news.url,
          relevanceScore: news.relevanceScore,
        })),
        companyInfo: companyData,
        source: `Dữ liệu được tổng hợp từ các nguồn uy tín như CafeF, VietStock, NDH, VnEconomy vào ngày ${currentDate}. Tìm kiếm thông qua hệ thống tìm kiếm web tích hợp.`,
        lastUpdated: currentDate,
      };

      return JSON.stringify(realData);
    } catch (error) {
      console.error('Failed to fetch real stock data:', error);

      // Fallback to placeholder data
      const placeholderData = {
        financialReportSummary: `[Dữ liệu giữ chỗ] Tóm tắt báo cáo tài chính quý gần nhất cho ${input.stockCode}.`,
        latestNews: `[Dữ liệu giữ chỗ] Tin tức quan trọng gần đây liên quan đến ${input.stockCode}.`,
        marketData: `[Dữ liệu giữ chỗ] Giá hiện tại, khối lượng giao dịch cho ${input.stockCode}.`,
        source: `[Nguồn giữ chỗ] Dữ liệu được tổng hợp từ các nguồn uy tín như CafeF, Vietstock, Sở Giao dịch Chứng khoán vào ngày ${currentDate}. Cần thay thế bằng nguồn API thực tế.`,
        error: 'Không thể lấy dữ liệu thời gian thực, sử dụng dữ liệu mẫu.',
      };
      return JSON.stringify(placeholderData);
    }
  }
);

const analyzeStockPrompt = ai.definePrompt({
  name: 'analyzeStockPrompt',
  tools: [fetchStockData],
  input: {schema: z.object({
    stockCode: AnalyzeStockInputSchema.shape.stockCode,
    currentDate: z.string().describe('Ngày hiện tại để tham chiếu cho dữ liệu mới nhất.'),
  })},
  output: {schema: AnalyzeStockOutputSchema},
  prompt: `Bạn là một nhà phân tích tài chính chuyên về cổ phiếu Việt Nam.
Nhiệm vụ của bạn là phân tích một cổ phiếu dựa trên mã cổ phiếu của nó, sử dụng dữ liệu cập nhật đến ngày hôm nay: {{{currentDate}}}.
Để làm điều này, bạn BẮT BUỘC phải sử dụng công cụ 'fetchStockData' để lấy các báo cáo tài chính mới nhất, kết quả kinh doanh, tin tức và dữ liệu liên quan theo thời gian thực cho mã cổ phiếu đã cho. Công cụ này sẽ trả về dữ liệu dưới dạng chuỗi JSON, bao gồm một trường "source" cho biết nguồn của dữ liệu.

Mã Cổ Phiếu: {{{stockCode}}}

Sau khi lấy dữ liệu bằng công cụ 'fetchStockData' (dữ liệu này bao gồm thông tin cập nhật đến {{{currentDate}}} và nguồn gốc dữ liệu), hãy phân tích kỹ lưỡng.
Dựa trên phân tích của bạn về dữ liệu đã lấy (bao gồm tin tức và báo cáo mới nhất đến hôm nay), hãy cung cấp:
1. Khuyến nghị "mua" hoặc "không mua" rõ ràng (lưu ý: giá trị trả về trong trường 'recommendation' phải là "mua" hoặc "không mua" theo đúng schema).
2. Nếu khuyến nghị là "mua", hãy đề xuất một mức giá mua.
3. Mức độ tin cậy (từ 0.0 đến 1.0) cho khuyến nghị của bạn.
4. Một phân tích chi tiết giải thích lý do của bạn. **Trong phần phân tích, hãy BẮT BUỘC trích dẫn nguồn thông tin bạn đã sử dụng, dựa trên trường "source" từ kết quả của công cụ 'fetchStockData'. Ví dụ: "Theo dữ liệu từ [tên nguồn theo trường source], ...".**
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

    try {
      // Try using enhanced AI system first
      const isEnhancedAvailable = await enhancedAI.isCurrentProviderAvailable();

      if (isEnhancedAvailable) {
        console.log('Using enhanced AI system for stock analysis');

        // Use the comprehensive stock analysis engine
        const analysisEngine = new StockAnalysisEngine();
        const config = enhancedAI.getCurrentConfig().stockAnalysis;

        try {
          const comprehensiveAnalysis = await analysisEngine.analyzeStock(input.stockCode, config);
          const recommendation = await analysisEngine.getRecommendation(input.stockCode, config);

          // Convert comprehensive analysis to legacy format
          const legacyOutput: AnalyzeStockOutput = {
            recommendation: recommendation.recommendation === 'buy' || recommendation.recommendation === 'strong_buy' ? 'mua' : 'không mua',
            suggestedPrice: recommendation.targetPrice,
            confidenceLevel: recommendation.confidence,
            analysis: `Phân tích toàn diện cho ${input.stockCode}:

${recommendation.rationale}

Chi tiết phân tích:
- Phân tích kỹ thuật: ${comprehensiveAnalysis.technicalAnalysis ?
  `Xu hướng ${comprehensiveAnalysis.technicalAnalysis.trend}, độ mạnh ${comprehensiveAnalysis.technicalAnalysis.strength}` :
  'Không có dữ liệu'}
- Phân tích cơ bản: ${comprehensiveAnalysis.fundamentalAnalysis ?
  `Điểm số ${(comprehensiveAnalysis.fundamentalAnalysis.score * 100).toFixed(0)}/100` :
  'Không có dữ liệu'}
- Phân tích tình cảm: ${comprehensiveAnalysis.sentimentAnalysis ?
  `Điểm số ${comprehensiveAnalysis.sentimentAnalysis.score.toFixed(2)}` :
  'Không có dữ liệu'}
- Đánh giá rủi ro: ${comprehensiveAnalysis.riskAssessment ?
  `Mức độ ${comprehensiveAnalysis.riskAssessment.overallRisk}` :
  'Không có dữ liệu'}

Các yếu tố chính: ${recommendation.keyFactors.join(', ')}
Rủi ro: ${recommendation.risks.join(', ')}
Cơ hội: ${recommendation.opportunities.join(', ')}

Dữ liệu được cập nhật đến ngày ${currentDate} từ hệ thống phân tích đa nguồn.`,
            stockCode: input.stockCode,
          };

          return legacyOutput;
        } catch (enhancedError) {
          console.warn('Enhanced analysis failed, falling back to AI prompt:', enhancedError);
          // Fall through to original prompt-based analysis
        }
      }

      // Fallback to original Genkit flow
      console.log('Using original Genkit flow for stock analysis');
      const {output} = await analyzeStockPrompt({...input, currentDate});
      return output!;

    } catch (error) {
      console.error('Stock analysis flow failed:', error);

      // Ultimate fallback - return basic analysis
      return {
        recommendation: 'không mua',
        confidenceLevel: 0.1,
        analysis: `Không thể phân tích cổ phiếu ${input.stockCode} do lỗi hệ thống. Vui lòng thử lại sau. Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`,
        stockCode: input.stockCode,
      };
    }
  }
);

