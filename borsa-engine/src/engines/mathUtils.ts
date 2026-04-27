// NaN CASCADE PREVENTION
export function calculateSMA(data: number[], period: number): number[] {
    const cleanValues = data.filter(Number.isFinite);
    const result: number[] = [];
    for (let i = 0; i < cleanValues.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
            continue;
        }
        const sum = cleanValues.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
    }
    return result;
}

export function calculateEMA(data: number[], period: number): number[] {
    // RULE 5: NaN CASCADE PREVENTION BEFORE LOOPING
    const cleanValues = data.filter(Number.isFinite);
    const result: number[] = [];
    const k = 2 / (period + 1);

    if (cleanValues.length < period) return Array(cleanValues.length).fill(NaN);

    let ema = cleanValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = 0; i < period - 1; i++) {
        result.push(NaN);
    }
    result.push(ema);

    for (let i = period; i < cleanValues.length; i++) {
        if (!Number.isFinite(cleanValues[i])) continue;
        ema = (cleanValues[i] * k) + (ema * (1 - k));
        result.push(ema);
    }
    return result;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
    // RULE 5: NaN CASCADE PREVENTION
    const cleanValues = data.filter(Number.isFinite);
    const result: number[] = [];

    if (cleanValues.length <= period) return Array(cleanValues.length).fill(NaN);

    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = cleanValues[i] - cleanValues[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = 0; i < period; i++) result.push(NaN);

    if (avgLoss === 0) {
        result.push(100);
    } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
    }

    for (let i = period + 1; i < cleanValues.length; i++) {
        if (!Number.isFinite(cleanValues[i])) continue;
        const diff = cleanValues[i] - cleanValues[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

        if (avgLoss === 0) {
            result.push(100);
        } else {
            const rs = avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
        }
    }
    return result;
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
    const cleanHighs = highs.filter(Number.isFinite);
    const cleanLows = lows.filter(Number.isFinite);
    const cleanCloses = closes.filter(Number.isFinite);

    if (cleanHighs.length < 2) return [];

    const tr: number[] = [cleanHighs[0] - cleanLows[0]];

    for (let i = 1; i < cleanHighs.length; i++) {
        const hl = cleanHighs[i] - cleanLows[i];
        const hc = Math.abs(cleanHighs[i] - cleanCloses[i - 1]);
        const lc = Math.abs(cleanLows[i] - cleanCloses[i - 1]);
        tr.push(Math.max(hl, hc, lc));
    }

    return calculateSMA(tr, period);
}
