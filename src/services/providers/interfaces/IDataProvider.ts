export interface IDataProvider {
    getProviderName(): string;
    isAvailable(): boolean;
}
