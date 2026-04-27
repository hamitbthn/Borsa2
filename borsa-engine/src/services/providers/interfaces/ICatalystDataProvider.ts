import { IDataProvider } from './IDataProvider';
import { StockCatalyst } from '../../../models/Stock';

export interface ICatalystDataProvider extends IDataProvider {
    getUpcomingCatalysts(symbol: string): Promise<StockCatalyst[]>;
}
