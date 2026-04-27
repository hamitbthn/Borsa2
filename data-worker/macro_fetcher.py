import os
import requests
import datetime
from sqlalchemy import create_engine, text

# Supabase Veritabanı
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/borsadb")
engine = create_engine(DATABASE_URL)

def upsert_macro_postgres(indicator_symbol, date_val, rate):
    try:
        with engine.begin() as conn:
            # macro_data tablosu eğer yoksa sistemin başında otonom açılır!
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS macro_data (
                    id SERIAL PRIMARY KEY,
                    indicator VARCHAR(50) NOT NULL,
                    value NUMERIC(10,4) NOT NULL,
                    entry_date DATE NOT NULL,
                    UNIQUE(indicator, entry_date)
                );
            """))
            # SADECE ON CONFLICT UPSERT MANTIĞI:
            conn.execute(text(f"""
                INSERT INTO macro_data (indicator, value, entry_date)
                VALUES ('{indicator_symbol}', {rate}, '{date_val}')
                ON CONFLICT (indicator, entry_date) DO UPDATE SET value = EXCLUDED.value;
            """))
            print(f"✅ Hayalet Makro Veri Yazıldı: {indicator_symbol} -> {rate} ({date_val})")
    except Exception as e:
        print(f"⚠️ Makro veri yazma rotası çöktü: {e}")

FRED_API_KEY = os.getenv("FRED_API_KEY", "DEMO_KEY")

def fetch_us_macro():
    print("🇺🇸 FRED üzerinden ABD Makro Verileri Çekiliyor...")
    try:
        cpi_url = f"https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key={FRED_API_KEY}&file_type=json"
        res = requests.get(cpi_url)
        if res.status_code == 200:
            data = res.json()['observations'][-1]
            upsert_macro_postgres('USA_INFLATION', data['date'], float(data['value']))
            print("✅ FRED CPI (Enflasyon) Başarıyla Alındı ve Yazıldı.")
    except Exception as e:
         print(f"❌ FRED Veri Çekimi Hatalı: {e}")

if __name__ == "__main__":
    fetch_us_macro()
