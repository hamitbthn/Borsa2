-- 1. ENUM TİPLERİ (Veri Bütünlüğünü Korumak İçin)
-- Motorumuzun üreteceği sinyalleri standartlaştırıyoruz. String hatalarını engeller.
CREATE TYPE trade_signal AS ENUM (
    'Strong Swing Opportunity', 
    'Watch for Entry', 
    'Neutral', 
    'Weak Setup', 
    'Avoid'
);

CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High');

-- 2. STOCKS (HİSSELER) TABLOSU
-- Evrenimizi (Universe) tanımlıyoruz. Sadece işlem yapacağımız ABD hisseleri.
CREATE TABLE stocks (
    symbol VARCHAR(10) PRIMARY KEY, -- Apple için AAPL, Tesla için TSLA vb.
    company_name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    industry VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE, -- Delist olan hisseleri filtrelemek için
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DAILY_OHLCV (GÜNLÜK FİYAT VE HACİM) TABLOSU
-- Polygon.io'dan her gece çekilecek veriler buraya yazılacak.
CREATE TABLE daily_ohlcv (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) REFERENCES stocks(symbol) ON DELETE CASCADE,
    date DATE NOT NULL,
    open NUMERIC(12, 4) NOT NULL,
    high NUMERIC(12, 4) NOT NULL,
    low NUMERIC(12, 4) NOT NULL,
    close NUMERIC(12, 4) NOT NULL,
    adj_close NUMERIC(12, 4) NOT NULL, -- HAYATİ ÖNEMDE: Split/Temettü düzeltilmiş fiyat
    volume BIGINT NOT NULL,
    CONSTRAINT unique_symbol_date UNIQUE (symbol, date) -- Bir hissenin aynı güne ait iki verisi olamaz (Double Entry koruması)
);

-- OHLCV Tablosu için Kritik İndeks (Karar Motoru son 150 mumu çekerken veritabanı kilitlenmesin diye)
CREATE INDEX idx_ohlcv_symbol_date ON daily_ohlcv (symbol, date DESC);


-- 4. FUNDAMENTALS (TEMEL ANALİZ) TABLOSU
-- Finnhub.io'dan çekilecek çeyreklik bilanço ve çarpan verileri.
CREATE TABLE fundamentals (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) REFERENCES stocks(symbol) ON DELETE CASCADE,
    period_date DATE NOT NULL, -- Bilançonun ait olduğu tarih
    pe_ratio NUMERIC(10, 4), -- Nullable (Zarar ediyorsa null)
    pb_ratio NUMERIC(10, 4),
    ev_ebitda NUMERIC(10, 4),
    revenue_growth_yoy NUMERIC(8, 4), -- % Büyüme
    net_income_growth_yoy NUMERIC(8, 4),
    debt_to_equity NUMERIC(10, 4),
    fcf_positive BOOLEAN,
    CONSTRAINT unique_fund_symbol_date UNIQUE (symbol, period_date)
);

CREATE INDEX idx_fundamentals_symbol ON fundamentals (symbol, period_date DESC);


-- 5. ENGINE_SIGNALS (KARAR MOTORU ÇIKTILARI) TABLOSU
-- Senin TypeScript motorunun her gece çalışıp ürettiği sonuçlar BURAYA kaydedilecek.
-- Mobil uygulaman (React Native) veriyi Polygon'dan veya senin TypeScript motorundan değil, SADECE bu tablodan okuyacak.
CREATE TABLE engine_signals (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) REFERENCES stocks(symbol) ON DELETE CASCADE,
    analysis_date DATE NOT NULL, -- Sinyalin üretildiği gün
    signal trade_signal NOT NULL,
    swing_score INTEGER CHECK (swing_score >= 0 AND swing_score <= 100),
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    risk risk_level NOT NULL,
    stop_loss NUMERIC(12, 4) NOT NULL,
    target_1 NUMERIC(12, 4) NOT NULL,
    target_2 NUMERIC(12, 4) NOT NULL,
    entry_zone VARCHAR(50) NOT NULL,
    value_trap_detected BOOLEAN DEFAULT FALSE,
    fake_momentum_detected BOOLEAN DEFAULT FALSE,
    catalyst_summary TEXT,
    CONSTRAINT unique_signal_symbol_date UNIQUE (symbol, analysis_date)
);

-- Mobil uygulama anasayfayı açtığında en yüksek skorlu hisseleri anında getirmek için indeks.
CREATE INDEX idx_signals_latest_score ON engine_signals (analysis_date DESC, swing_score DESC);
