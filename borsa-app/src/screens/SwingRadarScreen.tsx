import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SwingAnalysisResult } from '../models/SwingAnalysisResult';
import { StockDetailCard } from '../components/StockDetailCard';
import { createClient } from '@supabase/supabase-js';

// SUPABASE CONFIG (Expo'da PUBLIC enviroment variable'ları EXPO_PUBLIC_ ile başlar)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const SwingRadarScreen = () => {
    // Sinyal verisi artık Supabase DB formatında (JSON Row olarak) gelecek 
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCalculatedResults = async () => {
        setLoading(true);
        // İstemci tarafında ağır RAM yiyen hesaplamalar YAYINDAN KALDIRILDI!
        // Sadece DB'den hazır veriyi okuyoruz (CQRS Query Yönü Modeli)

        // const targetDate = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('engine_signals')
            .select('*')
            // .eq('analysis_date', targetDate) // Test ederken geçmiş datayı de görmek adına opsiyoneldir.
            .order('swing_score', { ascending: false })
            .limit(20);

        if (error) {
            console.error("Supabase Error:", error);
        } else if (data) {
            setResults(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCalculatedResults();
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4DA8DA" />
                <Text style={styles.loadingText}>Hayalet Bulut'a (Supabase) Bağlanılıyor...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Swing Radar</Text>
            <Text style={styles.subtitle}>Supabase Bulut Sinyalleri (0 İşlem Yükü)</Text>
            <Text style={styles.disclaimer}>⚠️ Uyarı: Sadece bir karar destek analizidir. Yatırım tavsiyesi değildir.</Text>

            {results.map((res) => {
                // UI objemizin beklediği (SwingAnalysisResult) formata Supabase Row'unu Cast ediyoruz (Mapper işlemi)
                const formattedResult: SwingAnalysisResult = {
                    symbol: res.symbol,
                    totalScore: res.swing_score,
                    classification: res.signal as any,
                    breakdown: {} as any, // Gereksiz ham veriler DB'den mobile çekilmiyor, RAM dostu
                    explanation: res.catalyst_summary || "Supabase bulutundan çekilen saf sinyal.",
                    warnings: res.value_trap_detected ? ["Değer Tuzağı Tespit Edildi, Risk Çok Yüksek!"] : [],
                    stopLoss: Number(res.stop_loss),
                    targetRange: { min: Number(res.target_1), max: Number(res.target_2) },
                    estimatedTimeframe: '2-6 Hafta'
                };
                return <StockDetailCard key={res.id || res.symbol} result={formattedResult} />;
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    center: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    loadingText: { color: '#FFF', marginTop: 15, fontSize: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
    subtitle: { fontSize: 14, color: '#AAA', marginBottom: 10 },
    disclaimer: { backgroundColor: '#332b00', color: '#FFD700', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 20 }
});
