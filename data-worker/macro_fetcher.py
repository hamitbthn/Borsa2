import requests
import datetime
import os
from sqlalchemy import create_engine
import pandas as pd

engine = create_engine("sqlite:///local_market_data.db")

# TCMB Başvuru Anahtarı ve Base URL
EVDS_API_KEY = os.getenv("EVDS_API_KEY", "DEMO_KEY")
EVDS_BASE_URL = "https://evds2.tcmb.gov.tr/service/evds/"

def fetch_bist_macro():
    """
    TCMB EVDS kullanılarak Makro Veriler (Enflasyon, Politika Faizi, Dolar Kuru) çekilir.
    Motorun "büyüme > enflasyon" kıyaslamasında kullanılır.
    """
    print("🇹🇷 TCMB EVDS'den Makro Veriler Çekiliyor...")
    headers = {"key": EVDS_API_KEY}
    
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=365*2)
    
    start_str = start_date.strftime("%d-%m-%Y")
    end_str = end_date.strftime("%d-%m-%Y")
    
    # TÜFE Serisi
    url = f"{EVDS_BASE_URL}series=TP.FG.J0&startDate={start_str}&endDate={end_str}&type=json"
    
    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            print("✅ TCMB Enflasyon Verisi (TÜFE) Başarıyla Alındı.")
            # db.save("macro_bist", res.json())
        else:
            print(f"⚠️ TCMB Bağlantı Hatası: {res.status_code}")
    except Exception as e:
        print(f"❌ TCMB Veri Çekimi Hatalı: {e}")

FRED_API_KEY = os.getenv("FRED_API_KEY", "DEMO_KEY")

def fetch_us_macro():
    """
    FRED API ile ABD Piyasaları için Federal Reserve Enflasyon (CPI) ve Faiz (FEDFUNDS) çekimi.
    """
    print("🇺🇸 FRED üzerinden ABD Makro Verileri Çekiliyor...")
    try:
        # ABD Tüketici Fiyat Endeksi
        cpi_url = f"https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key={FRED_API_KEY}&file_type=json"
        res = requests.get(cpi_url)
        if res.status_code == 200:
            print("✅ FRED CPI (Enflasyon) Başarıyla Alındı.")
    except Exception as e:
         print(f"❌ FRED Veri Çekimi Hatalı: {e}")

if __name__ == "__main__":
    fetch_bist_macro()
    fetch_us_macro()
