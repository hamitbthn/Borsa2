import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SwingAnalysisResult } from '../../models/SwingAnalysisResult';

export const StockDetailCard = ({ result }: { result: SwingAnalysisResult }) => {
    const isHighRisk = result.classification === 'Avoid / High Risk';
    const isOpportunity = result.totalScore >= 65;

    return (
        <View style={[styles.card, isHighRisk ? styles.borderRed : (isOpportunity ? styles.borderGreen : styles.borderGray)]}>
            <View style={styles.header}>
                <Text style={styles.symbol}>{result.symbol}</Text>
                <Text style={[styles.score, isOpportunity && styles.textGreen]}>{result.totalScore}/100</Text>
            </View>
            <Text style={styles.classification}>{result.classification}</Text>
            <Text style={styles.explanation}>{result.explanation}</Text>

            {result.warnings.length > 0 && (
                <View style={styles.warningsContainer}>
                    {result.warnings.map((w, i) => (
                        <Text key={i} style={styles.warningText}>⚠️ {w}</Text>
                    ))}
                </View>
            )}

            <View style={styles.footer}>
                {result.stopLoss ? <Text style={styles.stopLoss}>Stop: {result.stopLoss.toFixed(2)}</Text> : <Text></Text>}
                {result.targetRange && (
                    <Text style={styles.target}>Target: {result.targetRange.min.toFixed(2)} - {result.targetRange.max.toFixed(2)}</Text>
                )}
            </View>
            <Text style={styles.timeframe}>Vade: {result.estimatedTimeframe}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1E1E1E', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1
    },
    borderRed: { borderColor: '#FF4C4C' },
    borderGreen: { borderColor: '#4CAF50' },
    borderGray: { borderColor: '#555' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    symbol: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
    score: { fontSize: 18, fontWeight: 'bold', color: '#AAA' },
    textGreen: { color: '#4CAF50' },
    classification: { fontSize: 16, color: '#4DA8DA', marginBottom: 10, fontWeight: '600' },
    explanation: { fontSize: 14, color: '#DDD', marginBottom: 10, lineHeight: 20 },
    warningsContainer: { backgroundColor: '#331515', padding: 10, borderRadius: 8, marginBottom: 10 },
    warningText: { color: '#FF6B6B', fontSize: 13, marginBottom: 4 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
    stopLoss: { color: '#FF4C4C', fontWeight: 'bold' },
    target: { color: '#4CAF50', fontWeight: 'bold' },
    timeframe: { color: '#888', fontSize: 12, marginTop: 10, textAlign: 'right' }
});
