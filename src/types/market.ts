/**
 * @fileOverview Định nghĩa các types và interfaces cho dữ liệu thị trường
 * Bao gồm dữ liệu giá theo thời gian thực, chỉ số thị trường, và thông tin giao dịch
 */

import { z } from 'zod';
import { StockExchange } from './stock';

// Enum cho trạng thái thị trường
export enum MarketStatus {
  PRE_MARKET = 'PRE_MARKET',     // Trước giờ giao dịch
  OPENING = 'OPENING',           // Đang mở cửa
  TRADING = 'TRADING',           // Đang giao dịch
  BREAK = 'BREAK',               // Nghỉ trưa
  CLOSING = 'CLOSING',           // Đang đóng cửa
  CLOSED = 'CLOSED',             // Đã đóng cửa
  HOLIDAY = 'HOLIDAY'            // Ngày nghỉ lễ
}

// Enum cho loại lệnh giao dịch
export enum OrderType {
  LO = 'LO',     // Lệnh giới hạn (Limit Order)
  MP = 'MP',     // Lệnh thị trường (Market Price)
  ATO = 'ATO',   // Lệnh khớp mở cửa (At The Opening)
  ATC = 'ATC'    // Lệnh khớp đóng cửa (At The Closing)
}

// Enum cho xu hướng giá
export enum PriceTrend {
  UP = 'UP',         // Tăng
  DOWN = 'DOWN',     // Giảm
  UNCHANGED = 'UNCHANGED', // Không đổi
  CEILING = 'CEILING',     // Trần
  FLOOR = 'FLOOR'          // Sàn
}

// Schema cho dữ liệu giá thời gian thực
export const RealTimePriceSchema = z.object({
  stockCode: z.string()
    .describe('Mã cổ phiếu'),
  
  timestamp: z.date()
    .describe('Thời gian cập nhật'),
  
  // Giá giao dịch
  currentPrice: z.number()
    .positive('Giá hiện tại phải là số dương')
    .describe('Giá hiện tại (VND)'),
  
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
    .optional()
    .describe('Giá đóng cửa phiên trước (VND)'),
  
  // Thay đổi giá
  priceChange: z.number()
    .describe('Thay đổi giá (+/-) (VND)'),
  
  priceChangePercent: z.number()
    .describe('Thay đổi giá theo phần trăm (%)'),
  
  trend: z.nativeEnum(PriceTrend)
    .describe('Xu hướng giá'),
  
  // Giá tham chiếu và giới hạn
  referencePrice: z.number()
    .positive('Giá tham chiếu phải là số dương')
    .describe('Giá tham chiếu (VND)'),
  
  ceilingPrice: z.number()
    .positive('Giá trần phải là số dương')
    .describe('Giá trần (VND)'),
  
  floorPrice: z.number()
    .positive('Giá sàn phải là số dương')
    .describe('Giá sàn (VND)'),
  
  // Khối lượng và giá trị
  volume: z.number()
    .nonnegative('Khối lượng phải là số không âm')
    .describe('Khối lượng giao dịch trong ngày'),
  
  value: z.number()
    .nonnegative('Giá trị giao dịch phải là số không âm')
    .describe('Giá trị giao dịch trong ngày (VND)'),
  
  averagePrice: z.number()
    .positive('Giá trung bình phải là số dương')
    .optional()
    .describe('Giá trung bình (VND)'),
  
  // Thông tin về nhà đầu tư nước ngoài
  foreignBuyVolume: z.number()
    .nonnegative('Khối lượng mua nước ngoài phải là số không âm')
    .optional()
    .describe('Khối lượng mua của nhà đầu tư nước ngoài'),
  
  foreignSellVolume: z.number()
    .nonnegative('Khối lượng bán nước ngoài phải là số không âm')
    .optional()
    .describe('Khối lượng bán của nhà đầu tư nước ngoài'),
  
  foreignNetVolume: z.number()
    .optional()
    .describe('Khối lượng mua ròng của nhà đầu tư nước ngoài'),
  
  // Thông tin sổ lệnh
  totalBidVolume: z.number()
    .nonnegative('Tổng khối lượng đặt mua phải là số không âm')
    .optional()
    .describe('Tổng khối lượng đặt mua'),
  
  totalAskVolume: z.number()
    .nonnegative('Tổng khối lượng đặt bán phải là số không âm')
    .optional()
    .describe('Tổng khối lượng đặt bán'),
  
  createdAt: z.date()
    .default(() => new Date())
    .describe('Thời gian tạo bản ghi')
});

export type RealTimePrice = z.infer<typeof RealTimePriceSchema>;

// Schema cho sổ lệnh (Order Book)
export const OrderBookSchema = z.object({
  stockCode: z.string()
    .describe('Mã cổ phiếu'),
  
  timestamp: z.date()
    .describe('Thời gian cập nhật'),
  
  // Lệnh mua (Bid)
  bidPrices: z.array(z.number().positive())
    .max(10)
    .describe('Danh sách giá đặt mua (tối đa 10 mức)'),
  
  bidVolumes: z.array(z.number().nonnegative())
    .max(10)
    .describe('Danh sách khối lượng đặt mua tương ứng'),
  
  // Lệnh bán (Ask)
  askPrices: z.array(z.number().positive())
    .max(10)
    .describe('Danh sách giá đặt bán (tối đa 10 mức)'),
  
  askVolumes: z.array(z.number().nonnegative())
    .max(10)
    .describe('Danh sách khối lượng đặt bán tương ứng'),
  
  // Thông tin tổng hợp
  totalBidVolume: z.number()
    .nonnegative()
    .describe('Tổng khối lượng đặt mua'),
  
  totalAskVolume: z.number()
    .nonnegative()
    .describe('Tổng khối lượng đặt bán'),
  
  spread: z.number()
    .nonnegative()
    .optional()
    .describe('Chênh lệch giá mua bán tốt nhất'),
  
  spreadPercent: z.number()
    .nonnegative()
    .optional()
    .describe('Chênh lệch giá mua bán theo phần trăm'),
  
  createdAt: z.date()
    .default(() => new Date())
    .describe('Thời gian tạo bản ghi')
});

export type OrderBook = z.infer<typeof OrderBookSchema>;

// Schema cho giao dịch (Trade/Tick)
export const TradeTickSchema = z.object({
  stockCode: z.string()
    .describe('Mã cổ phiếu'),
  
  timestamp: z.date()
    .describe('Thời gian giao dịch'),
  
  price: z.number()
    .positive('Giá giao dịch phải là số dương')
    .describe('Giá giao dịch (VND)'),
  
  volume: z.number()
    .positive('Khối lượng giao dịch phải là số dương')
    .describe('Khối lượng giao dịch'),
  
  value: z.number()
    .positive('Giá trị giao dịch phải là số dương')
    .describe('Giá trị giao dịch (VND)'),
  
  orderType: z.nativeEnum(OrderType)
    .optional()
    .describe('Loại lệnh giao dịch'),
  
  side: z.enum(['BUY', 'SELL'])
    .optional()
    .describe('Phía giao dịch (mua/bán)'),
  
  // Thông tin tích lũy
  accumulatedVolume: z.number()
    .nonnegative()
    .describe('Khối lượng tích lũy từ đầu phiên'),
  
  accumulatedValue: z.number()
    .nonnegative()
    .describe('Giá trị tích lũy từ đầu phiên (VND)'),
  
  createdAt: z.date()
    .default(() => new Date())
    .describe('Thời gian tạo bản ghi')
});

export type TradeTick = z.infer<typeof TradeTickSchema>;

// Schema cho chỉ số thị trường
export const MarketIndexSchema = z.object({
  indexCode: z.string()
    .describe('Mã chỉ số (VN-Index, HNX-Index, UPCoM-Index)'),
  
  exchange: z.nativeEnum(StockExchange)
    .describe('Sàn giao dịch'),
  
  timestamp: z.date()
    .describe('Thời gian cập nhật'),
  
  value: z.number()
    .positive('Giá trị chỉ số phải là số dương')
    .describe('Giá trị chỉ số'),
  
  change: z.number()
    .describe('Thay đổi so với phiên trước'),
  
  changePercent: z.number()
    .describe('Thay đổi theo phần trăm (%)'),
  
  openValue: z.number()
    .positive('Giá trị mở cửa phải là số dương')
    .describe('Giá trị mở cửa'),
  
  highValue: z.number()
    .positive('Giá trị cao nhất phải là số dương')
    .describe('Giá trị cao nhất trong ngày'),
  
  lowValue: z.number()
    .positive('Giá trị thấp nhất phải là số dương')
    .describe('Giá trị thấp nhất trong ngày'),
  
  // Thống kê thị trường
  totalVolume: z.number()
    .nonnegative()
    .describe('Tổng khối lượng giao dịch'),
  
  totalValue: z.number()
    .nonnegative()
    .describe('Tổng giá trị giao dịch (VND)'),
  
  advancingStocks: z.number()
    .nonnegative()
    .describe('Số mã tăng'),
  
  decliningStocks: z.number()
    .nonnegative()
    .describe('Số mã giảm'),
  
  unchangedStocks: z.number()
    .nonnegative()
    .describe('Số mã đứng giá'),
  
  ceilingStocks: z.number()
    .nonnegative()
    .describe('Số mã trần'),
  
  floorStocks: z.number()
    .nonnegative()
    .describe('Số mã sàn'),
  
  createdAt: z.date()
    .default(() => new Date())
    .describe('Thời gian tạo bản ghi')
});

export type MarketIndex = z.infer<typeof MarketIndexSchema>;

// Schema cho thông tin phiên giao dịch
export const TradingSessionSchema = z.object({
  date: z.date()
    .describe('Ngày giao dịch'),
  
  exchange: z.nativeEnum(StockExchange)
    .describe('Sàn giao dịch'),
  
  status: z.nativeEnum(MarketStatus)
    .describe('Trạng thái thị trường'),
  
  openTime: z.string()
    .optional()
    .describe('Thời gian mở cửa (HH:mm)'),
  
  closeTime: z.string()
    .optional()
    .describe('Thời gian đóng cửa (HH:mm)'),
  
  breakStartTime: z.string()
    .optional()
    .describe('Thời gian bắt đầu nghỉ trưa (HH:mm)'),
  
  breakEndTime: z.string()
    .optional()
    .describe('Thời gian kết thúc nghỉ trưa (HH:mm)'),
  
  isHoliday: z.boolean()
    .default(false)
    .describe('Có phải ngày nghỉ lễ không'),
  
  holidayName: z.string()
    .optional()
    .describe('Tên ngày lễ (nếu có)'),
  
  createdAt: z.date()
    .default(() => new Date())
    .describe('Thời gian tạo bản ghi'),
  
  updatedAt: z.date()
    .default(() => new Date())
    .describe('Thời gian cập nhật cuối cùng')
});

export type TradingSession = z.infer<typeof TradingSessionSchema>;

// Utility functions
export const isMarketOpen = (status: MarketStatus): boolean => {
  return status === MarketStatus.TRADING || status === MarketStatus.OPENING;
};

export const calculateSpread = (bestBid: number, bestAsk: number): number => {
  return bestAsk - bestBid;
};

export const calculateSpreadPercent = (bestBid: number, bestAsk: number): number => {
  const spread = calculateSpread(bestBid, bestAsk);
  const midPrice = (bestBid + bestAsk) / 2;
  return (spread / midPrice) * 100;
};

// Constants
export const MARKET_CONSTANTS = {
  TRADING_HOURS: {
    MORNING_START: '09:00',
    MORNING_END: '11:30',
    AFTERNOON_START: '13:00',
    AFTERNOON_END: '15:00'
  },
  ORDER_BOOK_DEPTH: 10,
  PRICE_CHANGE_LIMIT: 0.07, // 7% giới hạn biến động giá
  TICK_SIZE: 100, // Bước giá tối thiểu (VND)
} as const;
