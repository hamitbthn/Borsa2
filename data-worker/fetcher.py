import os
import yfinance as yf
import pandas as pd
from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.dialects.postgresql import insert

# SADECE POSTGRESQL! SQLite (local_market_data.db) artık yasak!
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/borsadb")
engine = create_engine(DATABASE_URL)
metadata = MetaData()

def upsert_ohlcv(engine, df, table_name):
    if df.empty: return
    table = Table(table_name, metadata, autoload_with=engine)
    with engine.begin() as conn:
        for idx, row in df.iterrows():
            stmt = insert(table).values(
                symbol=row['symbol'],
                date=row['date'],
                open=row['open'],
                high=row['high'],
                low=row['low'],
                close=row['close'],
                adj_close=row['adj_close'], # Temettü korumalı sütun
                volume=row['volume']
            )
            update_dict = {c.name: c for c in stmt.excluded if not c.primary_key}
            stmt = stmt.on_conflict_do_update(
                index_elements=['symbol', 'date'],
                set_=update_dict
            )
            conn.execute(stmt)

def fetch_yfinance_history(symbol):
    print(f"[Fetcher] {symbol} (yFinance) verisi çekiliyor...")
    try:
        data = yf.download(symbol, period="5y", auto_adjust=True)
        if data.empty:
            print(f"[-] {symbol} verisi boş.")
            return

        df = data.reset_index()
        df['symbol'] = symbol
        df = df.rename(columns={
            'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 
            'Close': 'close', 'Volume': 'volume'
        })
        
        # auto_adjust=True olduğu için Close aslında Adj Close'tur. Kopya sütun oluşturuluyor:
        df['adj_close'] = df['close'] 
        df['date'] = pd.to_datetime(df['date']).dt.date
        df = df[['symbol', 'date', 'open', 'high', 'low', 'close', 'adj_close', 'volume']]
        
        upsert_ohlcv(engine, df, 'daily_ohlcv')
        print(f"✅ {symbol} yFinance verileri Supabase (PostgreSQL) veritabanına Başarıyla UPSERT edildi.")
    except Exception as e:
        print(f"❌ Hata ({symbol}): {e}")

if __name__ == "__main__":
    symbols = ["AAPL", "TSLA"]
    for sym in symbols:
        fetch_yfinance_history(sym)
