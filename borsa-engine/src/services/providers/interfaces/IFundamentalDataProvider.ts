import { IDataProvider } from './IDataProvider';
import { StockFundamental } from '../../../models/Stock';

export interface IFundamentalDataProvider extends IDataProvider {
    getFundamentals(symbol: string): Promise<StockFundamental>;
}
