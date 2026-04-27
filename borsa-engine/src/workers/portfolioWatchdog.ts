/**
 * CANLI İZLEME VE UYARI SİSTEMİ (Portfolio Watchdog)
 * 2-6 haftalık elde tutulan pozisyonların piyasa kapanışındaki günlük nöbetçisi.
 */
import { OHLCV } from '../engines/types';
import { calculateRSI } from '../engines/mathUtils';

export interface Position {
    symbol: string;
    entryPrice: number;
    allocatedCapital: number;
    stopLoss: number;
    targetMin: number;
}

export function evaluatePortfolioDaily(position: Position, latestOhlcv: OHLCV[], latestNewsImpact: string | null) {
    if (latestOhlcv.length < 1) return null;

    const closes = latestOhlcv.map(d => d.close);
    const currentPrice = closes[closes.length - 1];

    const messages: string[] = [];

    // 1. Hedef Satış Kontrolü
    if (currentPrice >= position.targetMin) {
        messages.push(`🟢 [KAR AL RİSKİ]: ${position.symbol} hedefe ulaştı. Risk/Ödül oranı tamamlandı. Pozisyonun büyük kısmını minimize edin.`);
    }

    // 2. Ölümcül Stop-Loss Tetiklenmesi
    if (currentPrice <= position.stopLoss) {
        messages.push(`🔴 [STOP-LOSS TETİKLENDİ]: ${position.symbol} stop seviyesi ($${position.stopLoss.toFixed(2)}) aşıldı. Kasa yönetimi gereği pozisyonu derhal kapatın.`);
    }

    // 3. Teknik Aşırı Isınma ve Balon Kontrolü (RSI)
    const rsiArr = calculateRSI(closes, 14);
    const currentRsi = rsiArr[rsiArr.length - 1];
    if (Number.isFinite(currentRsi) && currentRsi > 80) {
        messages.push(`⚠️ [AŞIRI ALIM DÜYARISI]: ${position.symbol} trend ivmesi tükeniyor, RSI ${currentRsi.toFixed(1)} seviyesinde (Aşırı Şişmiş). Yarı pozisyon satışı önerilir.`);
    }

    // 4. Beklenmeyen Siyah Kuğu Olayı / Haber Şoku
    if (latestNewsImpact === 'NEGATIVE') {
        messages.push(`🚨 [FUNDAMENTAL ŞOK]: ${position.symbol} firmasında ani negatif haber engeli! Pozisyonda radikal revizyona gidin.`);
    }

    // Uyarı listesini döndür. Uygulama bunları Telegram API, Discord Webhook vb. atabilir.
    return messages.length > 0 ? messages : null;
}
