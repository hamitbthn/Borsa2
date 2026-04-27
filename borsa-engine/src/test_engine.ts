import { MockDataProvider } from './services/providers/mock/MockDataProvider';
import { SwingOpportunityEngine } from './services/engines/SwingOpportunityEngine';

async function runTest() {
    const provider = new MockDataProvider();
    const engine = new SwingOpportunityEngine(provider, provider, provider);

    const symbols = await provider.getAllSymbols();

    for (const sym of symbols) {
        const result = await engine.analyzeStock(sym);
        console.log(`\n=== Sonuç: ${sym} ===`);
        console.log(`Sınıflandırma: ${result.classification} (${result.totalScore}/100)`);
        console.log(`Açıklama: ${result.explanation}`);
        if (result.warnings.length) {
            console.log(`Uyarılar: ${result.warnings.join(' | ')}`);
        }
        console.log(`Risk Aralığı -> Stop: ${result.stopLoss ?? 'Yok'}, Hedef: ${result.targetRange?.min.toFixed(2)} - ${result.targetRange?.max.toFixed(2)}`);
    }
}

runTest();
