import yfinance as yf
import pandas as pd
import datetime
from sqlalchemy import create_engine
import os
import time

# Çevresel değişkenlerden veritabanı yollarını oku (Fallback olarak SQLite kullanıyoruz testi kolaylaştırmak için)
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "borsa_db")

# Örnek PostgreSQL Bağlantısı, yerel testlerde sqlite çalışsın:
# engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}")
engine = create_engine("sqlite:///local_market_data.db")

def fetch_us_stocks(symbols, years=5):
    """
    Belirtilen hisselerin son 5 yıllık verisini yfinance kullanarak çeker.
    auto_adjust=True sayesinde; temettü, split (hisse bölünmesi) vb sorunlar OHLC verisinde 
    otomatik geriye dönük normalize edilir! Bu sayede ani Fake çöküş grafiklerinden hesaplanacak yanlış RSI engellenir.
    """
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=years * 365)
    
    all_data = []
    
    for symbol in symbols:
        print(f"[{symbol}] Fiyat/Hacim verisi çekiliyor ({years} Yıllık)...")
        try:
            ticker = yf.Ticker(symbol)
            # auto_adjust=True: Kritik adım (veriyi split/dividend'e göre normalize eder)
            df = ticker.history(start=start_date, end=end_date, auto_adjust=True)
            
            if df.empty:
                print(f"[-] {symbol} için veri bulunamadı!")
                continue
                
            df.reset_index(inplace=True)
            df['symbol'] = symbol
            
            # Veritabanı tipolojisine dönüştür
            df.rename(columns={
                'Date': 'date',
                'Open': 'open',
                'High': 'high',
                'Low': 'low',
                'Close': 'close',
                'Volume': 'volume'
            }, inplace=True)
            
            # Tarih dönüşümü
            df['date'] = pd.to_datetime(df['date']).dt.date
            
            cols_to_keep = ['date', 'symbol', 'open', 'high', 'low', 'close', 'volume']
            df = df[cols_to_keep]
            
            # Bozuk (NaN verileri düşürerek güvenliği sağla)
            df.dropna(inplace=True)
            all_data.append(df)
            
            # Rate limiting ve API nezaketi için bekleme
            time.sleep(0.5)
            
        except Exception as e:
            print(f"[X] {symbol} verisi çekilirken hata: {e}")
            
    if all_data:
        final_df = pd.concat(all_data, ignore_index=True)
        print("💾 Veritabanına yazılıyor (ohlcv_data)...")
        try:
            final_df.to_sql('ohlcv_data', engine, if_exists='replace', index=False)
            print("✅ OHLCV Verileri başarıyla kaydedildi!")
        except Exception as e:
             print(f"❌ Veritabanı Hatası: {e}")
             final_df.to_csv('ohlcv_data_backup.csv', index=False)
             print("⚠️ Veri ohlcv_data_backup.csv olarak yedeklendi.")

def fetch_fundamentals(symbols):
    """
    Bilanço ve çarpan metriklerini kazıyarak sisteme hazır hale getirir.
    """
    fundamentals_list = []
    for symbol in symbols:
        print(f"[{symbol}] Temel analiz verisi çekiliyor...")
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            data = {
                'symbol': symbol,
                'pe_ratio': info.get('trailingPE', None),
                'pb_ratio': info.get('priceToBook', None),
                'ev_ebitda': info.get('enterpriseToEbitda', None),
                'debt_to_equity': info.get('debtToEquity', None),
                'revenue_growth': info.get('revenueGrowth', None),
                'net_income_growth': info.get('earningsGrowth', None),
                'free_cash_flow_positive': info.get('freeCashflow', 0) > 0 if info.get('freeCashflow') is not None else None,
                'last_updated': datetime.date.today()
            }
            fundamentals_list.append(data)
            time.sleep(0.5)
        except Exception as e:
            print(f"[X] {symbol} temel analizi çekilirken hata: {e}")
            
    if fundamentals_list:
        df = pd.DataFrame(fundamentals_list)
        try:
            df.to_sql('fundamentals_data', engine, if_exists='replace', index=False)
            print("✅ Temel Analiz Verileri (Fundamentals) başarıyla kaydedildi!")
        except Exception as e:
            print(f"❌ Veritabanı Hatası: {e}")
            df.to_csv('fundamentals_backup.csv', index=False)
            print("⚠️ Veri fundamentals_backup.csv olarak yedeklendi.")

if __name__ == "__main__":
    us_symbols = ["AAPL", "MSFT", "TSLA", "NVDA", "AMD"]
    print("🚀 Data Worker ETL Pipeline Başlatılıyor...")
    fetch_us_stocks(us_symbols, years=5)
    fetch_fundamentals(us_symbols)
