import { IMarketDataProvider } from '../interfaces/IMarketDataProvider';
import { IFundamentalDataProvider } from '../interfaces/IFundamentalDataProvider';
import { ICatalystDataProvider } from '../interfaces/ICatalystDataProvider';
import { StockOHLCV, StockFundamental, StockCatalyst } from '../../../models/Stock';
import { ALL_MOCK_STOCKS } from './MockScenarios';

export class MockDataProvider implements IMarketDataProvider, IFundamentalDataProvider, ICatalystDataProvider {
    getProviderName(): string {
        return 'MockHybridProvider';
    }

    isAvailable(): boolean {
        return true;
    }

    // IMarketDataProvider
    async getHistoricalData(symbol: string, timeframe: '1D' | '1W' | '1M', limit: number): Promise<StockOHLCV[]> {
        const stock = ALL_MOCK_STOCKS.find(s => s.symbol === symbol);
        if (!stock) throw new Error(`Stock ${symbol} not found`);
        return stock.historicalData.slice(-limit);
    }

    async getCurrentPrice(symbol: string): Promise<number> {
        const stock = ALL_MOCK_STOCKS.find(s => s.symbol === symbol);
        if (!stock) throw new Error(`Stock ${symbol} not found`);
        return stock.currentPrice;
    }

    async getVolumeAverage(symbol: string, days: number): Promise<number> {
        const stock = ALL_MOCK_STOCKS.find(s => s.symbol === symbol);
        if (!stock) return 0;
        const recentData = stock.historicalData.slice(-days);
        if (recentData.length === 0) return 0;
        const totalVolume = recentData.reduce((acc, curr) => acc + curr.volume, 0);
        return totalVolume / recentData.length;
    }

    // IFundamentalDataProvider
    async getFundamentals(symbol: string): Promise<StockFundamental> {
        const stock = ALL_MOCK_STOCKS.find(s => s.symbol === symbol);
        if (!stock) throw new Error(`Stock ${symbol} not found`);
        return stock.fundamentals;
    }

    // ICatalystDataProvider
    async getUpcomingCatalysts(symbol: string): Promise<StockCatalyst[]> {
        const stock = ALL_MOCK_STOCKS.find(s => s.symbol === symbol);
        if (!stock) throw new Error(`Stock ${symbol} not found`);
        return stock.catalysts;
    }

    // Helper to fetch all available symbols for testing
    async getAllSymbols(): Promise<string[]> {
        return ALL_MOCK_STOCKS.map(s => s.symbol);
    }
}
