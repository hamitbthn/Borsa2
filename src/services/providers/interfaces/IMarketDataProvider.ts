import { IDataProvider } from './IDataProvider';
import { StockOHLCV } from '../../../models/Stock';

export interface IMarketDataProvider extends IDataProvider {
    getHistoricalData(symbol: string, timeframe: '1D' | '1W' | '1M', limit: number): Promise<StockOHLCV[]>;
    getCurrentPrice(symbol: string): Promise<number>;
    getVolumeAverage(symbol: string, days: number): Promise<number>;
}
