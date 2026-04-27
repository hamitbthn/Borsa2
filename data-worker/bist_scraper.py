import os
import requests
import pandas as pd
from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.dialects.postgresql import insert
import datetime

# PostgreSQL Bağlantısı (Supabase) - SQLite TAMAMEN KALDIRILDI!
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/borsadb")
engine = create_engine(DATABASE_URL)
metadata = MetaData()

def upsert_ohlcv(engine, df, table_name):
    if df.empty: return
    table = Table(table_name, metadata, autoload_with=engine)
    
    # Gerçek UPSERT mantığı: Unique Key çakışmasında Update ile yamalar
    with engine.begin() as conn:
        for idx, row in df.iterrows():
            stmt = insert(table).values(
                symbol=row['symbol'],
                date=row['date'],
                open=row['open'],
                high=row['high'],
                low=row['low'],
                close=row['close'],
                adj_close=row['adj_close'], # Adj_close EKLENDİ!
                volume=row['volume']
            )
            update_dict = {
                c.name: c for c in stmt.excluded if not c.primary_key
            }
            stmt = stmt.on_conflict_do_update(
                index_elements=['symbol', 'date'], # CONSTRAINT BAZLI ÇATIŞMA ÖNLEME
                set_=update_dict
            )
            conn.execute(stmt)

def fetch_is_yatirim_history(symbol):
    print(f"[BIST] {symbol} için İş Yatırım scraping başlatıldı...")
    url = "https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/HisseTekil"
    end = datetime.datetime.now()
    start = end - datetime.timedelta(days=365*5)
    params = {
        "hisse": symbol,
        "startdate": start.strftime("%d-%m-%Y"),
        "enddate": end.strftime("%d-%m-%Y")
    }
    try:
        response = requests.get(url, params=params)
        data = response.json()
        if 'value' in data and len(data['value']) > 0:
            df = pd.DataFrame(data['value'])
            df.columns = ['symbol', 'date', 'close', 'open', 'high', 'low', 'vwap', 'volume_try', 'volume']
            df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y').dt.date
            
            # İş Yatırım verisinde Split/Temettü hesabı manual yapıldığı için 
            # şimdilik adj_close olarak kapanışı ekliyoruz, ilerde buraya Fintables API bağlanacak.
            df['adj_close'] = df['close'] 
            
            upsert_ohlcv(engine, df, 'daily_ohlcv')
            print(f"✅ [{symbol}] Upsert işlemi başarıyla tamamlandı. Veri kirliliği (Double-Entry) önlendi.")
        else:
            print(f"[-] [{symbol}] Veri bulunamadı.")
    except Exception as e:
        print(f"❌ Scraping hatası {symbol}: {e}")

if __name__ == "__main__":
    for sym in ["THYAO", "EREGL"]:
         fetch_is_yatirim_history(sym)
