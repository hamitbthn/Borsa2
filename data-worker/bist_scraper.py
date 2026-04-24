import requests
import pandas as pd
from sqlalchemy import create_engine
import datetime

engine = create_engine("sqlite:///local_market_data.db")

def fetch_is_yatirim_history(symbol):
    """
    İş Yatırım web sitesi üzerinden geçmişe dönük BIST OHLCV verisini (ücretsiz) çeken 'Gerilla' scraper.
    """
    print(f"[BIST] {symbol} için İş Yatırım scraping başlatıldı...")
    
    # İş Yatırım Halka Açık JSON Endpoint'i
    url = "https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/HisseTekil"
    
    # 5 Yıllık Veri Aralığı
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
            
            # Kolon dönüşümü (İş Yatırım formatından standart formata)
            # 0: Sembol, 1: Date, 2: Kapanış, 3: Açılış, 4: Yüksek, 5: Düşük, 6: VWAP, 7: Hacim(TL), 8: Hacim(Lot)
            df.columns = ['symbol', 'date', 'close', 'open', 'high', 'low', 'vwap', 'volume_try', 'volume']
            df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y').dt.date
            
            # Veritabanına append
            df.to_sql('bist_ohlcv_data', engine, if_exists='append', index=False)
            print(f"✅ [{symbol}] Başarıyla kaydedildi.")
        else:
            print(f"[-] [{symbol}] Veri bulunamadı. Formatta veya endpoint'te değişiklik olabilir.")
            
    except Exception as e:
        print(f"❌ Scraping hatası {symbol}: {e}")

if __name__ == "__main__":
    bist_symbols = ["THYAO", "EREGL", "TUPRS", "ASELS", "FROTO"]
    print("🚀 BIST İş Yatırım Scraper Başlatılıyor...")
    for sym in bist_symbols:
        fetch_is_yatirim_history(sym)
