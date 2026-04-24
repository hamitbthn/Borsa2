export interface StockOHLCV {
  date: string; // ISO 8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockFundamental {
  peRatio: number;
  pbRatio: number;
  evEbitda: number;
  debtToEquity: number;
  revenueGrowth: number;
  netIncomeGrowth: number;
  profitMargin: number;
  sectorAvgPe?: number;
  sectorAvgPb?: number;
}

export interface StockCatalyst {
  type: 'EARNINGS' | 'DIVIDEND' | 'M_A' | 'TENDER' | 'REGULATORY' | 'OTHER';
  date: string;
  expectedImpact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  description: string;
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
  currentPrice: number;
  historicalData: StockOHLCV[];
  fundamentals: StockFundamental;
  catalysts: StockCatalyst[];
}
