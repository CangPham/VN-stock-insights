/**
 * @fileOverview Định nghĩa các types và interfaces cho dữ liệu cổ phiếu Việt Nam
 * Bao gồm thông tin cơ bản về cổ phiếu, công ty, và dữ liệu thị trường
 */

import { z } from 'zod';

// Enum cho các sàn giao dịch Việt Nam
export enum StockExchange {
  HOSE = 'HOSE', // Sở Giao dịch Chứng khoán TP.HCM
  HNX = 'HNX',   // Sở Giao dịch Chứng khoán Hà Nội
  UPCOM = 'UPCOM' // Thị trường Giao dịch Cổ phiếu của các Công ty Đại chúng chưa niêm yết
}

// Enum cho các ngành kinh doanh chính
export enum IndustryType {
  BANKING = 'BANKING',                    // Ngân hàng
  REAL_ESTATE = 'REAL_ESTATE',           // Bất động sản
  TECHNOLOGY = 'TECHNOLOGY',              // Công nghệ
  MANUFACTURING = 'MANUFACTURING',        // Sản xuất
  RETAIL = 'RETAIL',                     // Bán lẻ
  ENERGY = 'ENERGY',                     // Năng lượng
  TELECOMMUNICATIONS = 'TELECOMMUNICATIONS', // Viễn thông
  HEALTHCARE = 'HEALTHCARE',             // Y tế
  FOOD_BEVERAGE = 'FOOD_BEVERAGE',       // Thực phẩm đồ uống
  TEXTILES = 'TEXTILES',                 // Dệt may
  CONSTRUCTION = 'CONSTRUCTION',          // Xây dựng
  TRANSPORTATION = 'TRANSPORTATION',      // Vận tải
  AGRICULTURE = 'AGRICULTURE',           // Nông nghiệp
  MINING = 'MINING',                     // Khai khoáng
  CHEMICALS = 'CHEMICALS',               // Hóa chất
  INSURANCE = 'INSURANCE',               // Bảo hiểm
  SECURITIES = 'SECURITIES',             // Chứng khoán
  UTILITIES = 'UTILITIES',               // Tiện ích công cộng
  OTHER = 'OTHER'                        // Khác
}

// Schema cho thông tin cơ bản của cổ phiếu
export const StockInfoSchema = z.object({
  stockCode: z.string()
    .min(2, 'Mã cổ phiếu phải có ít nhất 2 ký tự')
    .max(10, 'Mã cổ phiếu tối đa 10 ký tự')
    .regex(/^[A-Z0-9]+$/, 'Mã cổ phiếu phải là chữ hoa và số')
    .describe('Mã cổ phiếu (VD: VCB, FPT)'),
  
  companyName: z.string()
    .min(1, 'Tên công ty không được để trống')
    .describe('Tên đầy đủ của công ty'),
  
  companyNameEn: z.string()
    .optional()
    .describe('Tên công ty bằng tiếng Anh'),
  
  exchange: z.nativeEnum(StockExchange)
    .describe('Sàn giao dịch'),
  
  industry: z.nativeEnum(IndustryType)
    .describe('Ngành kinh doanh chính'),
  
  subIndustry: z.string()
    .optional()
    .describe('Ngành kinh doanh phụ chi tiết'),
  
  listedDate: z.date()
    .optional()
    .describe('Ngày niêm yết'),
  
  charteredCapital: z.number()
    .positive('Vốn điều lệ phải là số dương')
    .optional()
    .describe('Vốn điều lệ (VND)'),
  
  outstandingShares: z.number()
    .positive('Số cổ phiếu lưu hành phải là số dương')
    .optional()
    .describe('Số cổ phiếu đang lưu hành'),
  
  marketCap: z.number()
    .positive('Vốn hóa thị trường phải là số dương')
    .optional()
    .describe('Vốn hóa thị trường (VND)'),
  
  website: z.string()
    .url('Website phải là URL hợp lệ')
    .optional()
    .describe('Website chính thức của công ty'),
  
  address: z.string()
    .optional()
    .describe('Địa chỉ trụ sở chính'),
  
  phone: z.string()
    .optional()
    .describe('Số điện thoại liên hệ'),
  
  email: z.string()
    .email('Email phải có định dạng hợp lệ')
    .optional()
    .describe('Email liên hệ'),
  
  description: z.string()
    .optional()
    .describe('Mô tả ngắn về hoạt động kinh doanh'),
  
  isActive: z.boolean()
    .default(true)
    .describe('Trạng thái hoạt động của cổ phiếu'),
  
  createdAt: z.date()
    .default(() => new Date())
    .describe('Thời gian tạo bản ghi'),
  
  updatedAt: z.date()
    .default(() => new Date())
    .describe('Thời gian cập nhật cuối cùng')
});

export type StockInfo = z.infer<typeof StockInfoSchema>;

// Schema cho dữ liệu giá cổ phiếu theo thời gian thực
export const StockPriceSchema = z.object({
  stockCode: z.string()
    .describe('Mã cổ phiếu'),
  
  date: z.date()
    .describe('Ngày giao dịch'),
  
  openPrice: z.number()
    .positive('Giá mở cửa phải là số dương')
    .describe('Giá mở cửa (VND)'),
  
  highPrice: z.number()
    .positive('Giá cao nhất phải là số dương')
    .describe('Giá cao nhất trong ngày (VND)'),
  
  lowPrice: z.number()
    .positive('Giá thấp nhất phải là số dương')
    .describe('Giá thấp nhất trong ngày (VND)'),
  
  closePrice: z.number()
    .positive('Giá đóng cửa phải là số dương')
    .describe('Giá đóng cửa (VND)'),
  
  adjustedPrice: z.number()
    .positive('Giá điều chỉnh phải là số dương')
    .optional()
    .describe('Giá điều chỉnh (VND)'),
  
  volume: z.number()
    .nonnegative('Khối lượng phải là số không âm')
    .describe('Khối lượng giao dịch (cổ phiếu)'),
  
  value: z.number()
    .nonnegative('Giá trị giao dịch phải là số không âm')
    .describe('Giá trị giao dịch (VND)'),
  
  priceChange: z.number()
    .describe('Thay đổi giá so với phiên trước (VND)'),
  
  priceChangePercent: z.number()
    .describe('Thay đổi giá theo phần trăm (%)'),
  
  averagePrice: z.number()
    .positive('Giá trung bình phải là số dương')
    .optional()
    .describe('Giá trung bình (VND)'),
  
  foreignBuyVolume: z.number()
    .nonnegative('Khối lượng mua nước ngoài phải là số không âm')
    .optional()
    .describe('Khối lượng mua của nhà đầu tư nước ngoài'),
  
  foreignSellVolume: z.number()
    .nonnegative('Khối lượng bán nước ngoài phải là số không âm')
    .optional()
    .describe('Khối lượng bán của nhà đầu tư nước ngoài'),
  
  createdAt: z.date()
    .default(() => new Date())
    .describe('Thời gian tạo bản ghi'),
  
  updatedAt: z.date()
    .default(() => new Date())
    .describe('Thời gian cập nhật cuối cùng')
});

export type StockPrice = z.infer<typeof StockPriceSchema>;

// Schema cho dữ liệu intraday (trong ngày)
export const IntradayDataSchema = z.object({
  stockCode: z.string()
    .describe('Mã cổ phiếu'),
  
  timestamp: z.date()
    .describe('Thời gian giao dịch'),
  
  price: z.number()
    .positive('Giá phải là số dương')
    .describe('Giá giao dịch (VND)'),
  
  volume: z.number()
    .nonnegative('Khối lượng phải là số không âm')
    .describe('Khối lượng giao dịch'),
  
  accumulatedVolume: z.number()
    .nonnegative('Khối lượng tích lũy phải là số không âm')
    .describe('Khối lượng tích lũy từ đầu phiên'),
  
  accumulatedValue: z.number()
    .nonnegative('Giá trị tích lũy phải là số không âm')
    .describe('Giá trị giao dịch tích lũy từ đầu phiên (VND)'),
  
  bidPrice1: z.number().positive().optional().describe('Giá đặt mua 1'),
  bidPrice2: z.number().positive().optional().describe('Giá đặt mua 2'),
  bidPrice3: z.number().positive().optional().describe('Giá đặt mua 3'),
  
  bidVolume1: z.number().nonnegative().optional().describe('Khối lượng đặt mua 1'),
  bidVolume2: z.number().nonnegative().optional().describe('Khối lượng đặt mua 2'),
  bidVolume3: z.number().nonnegative().optional().describe('Khối lượng đặt mua 3'),
  
  askPrice1: z.number().positive().optional().describe('Giá đặt bán 1'),
  askPrice2: z.number().positive().optional().describe('Giá đặt bán 2'),
  askPrice3: z.number().positive().optional().describe('Giá đặt bán 3'),
  
  askVolume1: z.number().nonnegative().optional().describe('Khối lượng đặt bán 1'),
  askVolume2: z.number().nonnegative().optional().describe('Khối lượng đặt bán 2'),
  askVolume3: z.number().nonnegative().optional().describe('Khối lượng đặt bán 3'),
  
  createdAt: z.date()
    .default(() => new Date())
    .describe('Thời gian tạo bản ghi')
});

export type IntradayData = z.infer<typeof IntradayDataSchema>;

// Utility functions cho validation
export const validateStockCode = (stockCode: string): boolean => {
  return /^[A-Z0-9]{2,10}$/.test(stockCode.toUpperCase());
};

export const normalizeStockCode = (stockCode: string): string => {
  return stockCode.toUpperCase().trim();
};

// Constants cho các giới hạn
export const STOCK_CONSTANTS = {
  MAX_STOCK_CODE_LENGTH: 10,
  MIN_STOCK_CODE_LENGTH: 2,
  MAX_COMPANY_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  TRADING_HOURS: {
    MORNING_START: '09:00',
    MORNING_END: '11:30',
    AFTERNOON_START: '13:00',
    AFTERNOON_END: '15:00'
  }
} as const;
