/**
 * @fileOverview Định nghĩa các types và interfaces cho báo cáo tài chính
 * Bao gồm bảng cân đối kế toán, báo cáo kết quả kinh doanh, báo cáo lưu chuyển tiền tệ
 */

import { z } from 'zod';

// Enum cho loại báo cáo tài chính
export enum ReportType {
  QUARTERLY = 'QUARTERLY',   // Báo cáo quý
  YEARLY = 'YEARLY',         // Báo cáo năm
  SEMI_ANNUAL = 'SEMI_ANNUAL' // Báo cáo 6 tháng
}

// Enum cho đơn vị tiền tệ
export enum CurrencyUnit {
  VND = 'VND',           // Đồng Việt Nam
  MILLION_VND = 'MILLION_VND',  // Triệu đồng
  BILLION_VND = 'BILLION_VND',  // Tỷ đồng
  USD = 'USD'            // Đô la Mỹ
}

// Schema cho thông tin chung của báo cáo tài chính
export const FinancialReportBaseSchema = z.object({
  stockCode: z.string()
    .describe('Mã cổ phiếu'),
  
  reportType: z.nativeEnum(ReportType)
    .describe('Loại báo cáo (quý/năm/6 tháng)'),
  
  year: z.number()
    .int()
    .min(2000)
    .max(2100)
    .describe('Năm báo cáo'),
  
  quarter: z.number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe('Quý báo cáo (nếu là báo cáo quý)'),
  
  reportDate: z.date()
    .describe('Ngày công bố báo cáo'),
  
  auditStatus: z.enum(['AUDITED', 'UNAUDITED', 'REVIEWED'])
    .describe('Trạng thái kiểm toán'),
  
  currencyUnit: z.nativeEnum(CurrencyUnit)
    .default(CurrencyUnit.MILLION_VND)
    .describe('Đơn vị tiền tệ'),
  
  createdAt: z.date()
    .default(() => new Date())
    .describe('Thời gian tạo bản ghi'),
  
  updatedAt: z.date()
    .default(() => new Date())
    .describe('Thời gian cập nhật cuối cùng')
});

// Schema cho Bảng Cân Đối Kế Toán (Balance Sheet)
export const BalanceSheetSchema = FinancialReportBaseSchema.extend({
  // TÀI SẢN (ASSETS)
  // Tài sản ngắn hạn
  cash: z.number().optional().describe('Tiền và tương đương tiền'),
  shortTermInvestments: z.number().optional().describe('Đầu tư ngắn hạn'),
  shortTermReceivables: z.number().optional().describe('Phải thu ngắn hạn'),
  inventory: z.number().optional().describe('Hàng tồn kho'),
  otherCurrentAssets: z.number().optional().describe('Tài sản ngắn hạn khác'),
  totalCurrentAssets: z.number().optional().describe('Tổng tài sản ngắn hạn'),
  
  // Tài sản dài hạn
  longTermReceivables: z.number().optional().describe('Phải thu dài hạn'),
  fixedAssets: z.number().optional().describe('Tài sản cố định'),
  longTermInvestments: z.number().optional().describe('Đầu tư dài hạn'),
  intangibleAssets: z.number().optional().describe('Tài sản vô hình'),
  otherLongTermAssets: z.number().optional().describe('Tài sản dài hạn khác'),
  totalLongTermAssets: z.number().optional().describe('Tổng tài sản dài hạn'),
  
  totalAssets: z.number().describe('Tổng tài sản'),
  
  // NGUỒN VỐN (LIABILITIES & EQUITY)
  // Nợ ngắn hạn
  shortTermDebt: z.number().optional().describe('Nợ ngắn hạn'),
  shortTermPayables: z.number().optional().describe('Phải trả ngắn hạn'),
  otherCurrentLiabilities: z.number().optional().describe('Nợ ngắn hạn khác'),
  totalCurrentLiabilities: z.number().optional().describe('Tổng nợ ngắn hạn'),
  
  // Nợ dài hạn
  longTermDebt: z.number().optional().describe('Nợ dài hạn'),
  otherLongTermLiabilities: z.number().optional().describe('Nợ dài hạn khác'),
  totalLongTermLiabilities: z.number().optional().describe('Tổng nợ dài hạn'),
  
  totalLiabilities: z.number().optional().describe('Tổng nợ phải trả'),
  
  // Vốn chủ sở hữu
  shareCapital: z.number().optional().describe('Vốn góp của chủ sở hữu'),
  retainedEarnings: z.number().optional().describe('Lợi nhuận chưa phân phối'),
  otherEquity: z.number().optional().describe('Vốn chủ sở hữu khác'),
  totalEquity: z.number().describe('Tổng vốn chủ sở hữu'),
  
  totalLiabilitiesAndEquity: z.number().describe('Tổng nguồn vốn')
});

export type BalanceSheet = z.infer<typeof BalanceSheetSchema>;

// Schema cho Báo Cáo Kết Quả Kinh Doanh (Income Statement)
export const IncomeStatementSchema = FinancialReportBaseSchema.extend({
  // Doanh thu
  revenue: z.number().describe('Doanh thu thuần'),
  grossRevenue: z.number().optional().describe('Doanh thu tổng'),
  
  // Chi phí
  costOfGoodsSold: z.number().optional().describe('Giá vốn hàng bán'),
  grossProfit: z.number().optional().describe('Lợi nhuận gộp'),
  
  // Chi phí hoạt động
  sellingExpenses: z.number().optional().describe('Chi phí bán hàng'),
  adminExpenses: z.number().optional().describe('Chi phí quản lý doanh nghiệp'),
  operatingExpenses: z.number().optional().describe('Tổng chi phí hoạt động'),
  
  operatingProfit: z.number().optional().describe('Lợi nhuận từ hoạt động kinh doanh'),
  
  // Thu nhập và chi phí khác
  financialIncome: z.number().optional().describe('Thu nhập tài chính'),
  financialExpenses: z.number().optional().describe('Chi phí tài chính'),
  otherIncome: z.number().optional().describe('Thu nhập khác'),
  otherExpenses: z.number().optional().describe('Chi phí khác'),
  
  profitBeforeTax: z.number().optional().describe('Lợi nhuận trước thuế'),
  
  // Thuế
  incomeTaxExpense: z.number().optional().describe('Chi phí thuế thu nhập doanh nghiệp'),
  
  netProfit: z.number().describe('Lợi nhuận sau thuế'),
  
  // Chỉ số trên cổ phiếu
  basicEPS: z.number().optional().describe('Thu nhập cơ bản trên cổ phiếu (EPS)'),
  dilutedEPS: z.number().optional().describe('Thu nhập suy giảm trên cổ phiếu'),
  
  // Thông tin bổ sung
  weightedAverageShares: z.number().optional().describe('Số cổ phiếu bình quân gia quyền'),
  
  // Lợi nhuận phân bổ
  profitAttributableToParent: z.number().optional().describe('Lợi nhuận thuộc về cổ đông công ty mẹ'),
  profitAttributableToMinority: z.number().optional().describe('Lợi nhuận thuộc về cổ đông thiểu số')
});

export type IncomeStatement = z.infer<typeof IncomeStatementSchema>;

// Schema cho Báo Cáo Lưu Chuyển Tiền Tệ (Cash Flow Statement)
export const CashFlowStatementSchema = FinancialReportBaseSchema.extend({
  // Lưu chuyển tiền từ hoạt động kinh doanh
  netProfitForCashFlow: z.number().optional().describe('Lợi nhuận sau thuế (cho BCLCTT)'),
  depreciation: z.number().optional().describe('Khấu hao tài sản cố định'),
  provisionExpenses: z.number().optional().describe('Chi phí dự phóng'),
  
  // Thay đổi trong tài sản và nợ hoạt động
  changeInReceivables: z.number().optional().describe('Thay đổi các khoản phải thu'),
  changeInInventory: z.number().optional().describe('Thay đổi hàng tồn kho'),
  changeInPayables: z.number().optional().describe('Thay đổi các khoản phải trả'),
  changeInOtherAssets: z.number().optional().describe('Thay đổi tài sản khác'),
  
  operatingCashFlow: z.number().describe('Lưu chuyển tiền thuần từ hoạt động kinh doanh'),
  
  // Lưu chuyển tiền từ hoạt động đầu tư
  capitalExpenditure: z.number().optional().describe('Chi tiêu đầu tư tài sản cố định'),
  investmentPurchases: z.number().optional().describe('Mua các khoản đầu tư'),
  investmentSales: z.number().optional().describe('Bán các khoản đầu tư'),
  otherInvestingActivities: z.number().optional().describe('Hoạt động đầu tư khác'),
  
  investingCashFlow: z.number().describe('Lưu chuyển tiền thuần từ hoạt động đầu tư'),
  
  // Lưu chuyển tiền từ hoạt động tài chính
  debtIssuance: z.number().optional().describe('Phát hành nợ'),
  debtRepayment: z.number().optional().describe('Trả nợ'),
  equityIssuance: z.number().optional().describe('Phát hành cổ phiếu'),
  dividendsPaid: z.number().optional().describe('Trả cổ tức'),
  otherFinancingActivities: z.number().optional().describe('Hoạt động tài chính khác'),
  
  financingCashFlow: z.number().describe('Lưu chuyển tiền thuần từ hoạt động tài chính'),
  
  // Tổng hợp
  netCashFlow: z.number().describe('Lưu chuyển tiền thuần trong kỳ'),
  beginningCash: z.number().optional().describe('Tiền và tương đương tiền đầu kỳ'),
  endingCash: z.number().describe('Tiền và tương đương tiền cuối kỳ'),
  
  // Thông tin bổ sung
  interestPaid: z.number().optional().describe('Tiền lãi vay đã trả'),
  incomeTaxPaid: z.number().optional().describe('Thuế thu nhập doanh nghiệp đã nộp')
});

export type CashFlowStatement = z.infer<typeof CashFlowStatementSchema>;

// Schema tổng hợp cho báo cáo tài chính đầy đủ
export const ComprehensiveFinancialReportSchema = z.object({
  stockCode: z.string().describe('Mã cổ phiếu'),
  reportType: z.nativeEnum(ReportType).describe('Loại báo cáo'),
  year: z.number().int().describe('Năm báo cáo'),
  quarter: z.number().int().optional().describe('Quý báo cáo'),
  
  balanceSheet: BalanceSheetSchema.optional().describe('Bảng cân đối kế toán'),
  incomeStatement: IncomeStatementSchema.optional().describe('Báo cáo kết quả kinh doanh'),
  cashFlowStatement: CashFlowStatementSchema.optional().describe('Báo cáo lưu chuyển tiền tệ'),
  
  createdAt: z.date().default(() => new Date()).describe('Thời gian tạo'),
  updatedAt: z.date().default(() => new Date()).describe('Thời gian cập nhật')
});

export type ComprehensiveFinancialReport = z.infer<typeof ComprehensiveFinancialReportSchema>;

// Utility functions
export const getReportPeriodString = (reportType: ReportType, year: number, quarter?: number): string => {
  switch (reportType) {
    case ReportType.QUARTERLY:
      return `Q${quarter}/${year}`;
    case ReportType.YEARLY:
      return `${year}`;
    case ReportType.SEMI_ANNUAL:
      return `6T/${year}`;
    default:
      return `${year}`;
  }
};

export const validateReportPeriod = (reportType: ReportType, quarter?: number): boolean => {
  if (reportType === ReportType.QUARTERLY && (!quarter || quarter < 1 || quarter > 4)) {
    return false;
  }
  return true;
};

// Constants
export const FINANCIAL_CONSTANTS = {
  REPORT_TYPES: Object.values(ReportType),
  CURRENCY_UNITS: Object.values(CurrencyUnit),
  AUDIT_STATUSES: ['AUDITED', 'UNAUDITED', 'REVIEWED'] as const,
  MAX_REPORT_AGE_DAYS: 365 * 5, // 5 năm
} as const;
