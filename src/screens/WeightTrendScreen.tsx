import { DashPathEffect } from '@shopify/react-native-skia';
import { CartesianChart, Line } from 'victory-native';
import { addDays, format, isAfter, parseISO, subMonths } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { StatCard } from '../components/StatCard';
import { useData } from '../lib/store';
import { expectedWeightOn, todayStr, weightPace } from '../lib/stats';
import { useSkiaStatus } from '../lib/useSkiaReady';
import { useColors, type Colors } from '../theme';

type Props = { navigation: any };

const RANGES = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: 'All', months: null as number | null },
];

export function WeightTrendScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { weightLogs, weightTarget, upsertWeightLog } = useData();
  const skiaStatus = useSkiaStatus();
  const [rangeIdx, setRangeIdx] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [input, setInput] = useState('');

  const sortedLogs = [...weightLogs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const current = sortedLogs[sortedLogs.length - 1];

  const chartData = useMemo(() => {
    if (!weightTarget) return [];
    const months = RANGES[rangeIdx].months;
    const cutoff = months ? subMonths(new Date(), months) : parseISO(weightTarget.start_date);

    const dateSet = new Set<string>();
    sortedLogs.forEach((l) => {
      if (!isAfter(cutoff, parseISO(l.log_date))) dateSet.add(l.log_date);
    });
    // include a point every week across the range so the expected line is smooth
    let cursor = isAfter(cutoff, parseISO(weightTarget.start_date)) ? cutoff : parseISO(weightTarget.start_date);
    const end = new Date();
    while (!isAfter(cursor, end)) {
      dateSet.add(format(cursor, 'yyyy-MM-dd'));
      cursor = addDays(cursor, 7);
    }

    const dates = [...dateSet].sort();
    const byDate = new Map(sortedLogs.map((l) => [l.log_date, l.value]));
    return dates.map((d) => ({
      date: format(parseISO(d), 'MMM d'),
      actual: byDate.get(d) ?? null,
      expected: expectedWeightOn(weightTarget, d),
    }));
  }, [sortedLogs, weightTarget, rangeIdx]);

  const yBounds = useMemo(() => {
    const values = chartData.flatMap((d) => [d.actual, d.expected]).filter((v): v is number => v != null);
    if (values.length === 0) return { min: 0, max: 0 };
    return { min: Math.floor(Math.min(...values)), max: Math.ceil(Math.max(...values)) };
  }, [chartData]);

  const pace = weightTarget && current ? weightPace(weightTarget, current.value) : null;
  const paceLabel = { ahead: 'Ahead', 'on-track': 'On track', behind: 'Behind', unknown: '—' };

  const saveWeight = () => {
    const val = parseFloat(input);
    if (!Number.isNaN(val) && val > 0) {
      upsertWeightLog(todayStr(), val);
      setInput('');
      setModalOpen(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Weight</Text>
        <Text style={styles.currentValue}>{current ? `${current.value} kg` : '—'}</Text>
      </View>

      {!weightTarget ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>Set a starting and target weight to see your trend.</Text>
          <Button mode="contained" onPress={() => navigation.navigate('EditWeightGoal')} style={{ marginTop: 10 }}>
            Set weight goal
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.rangeRow}>
            {RANGES.map((r, i) => (
              <Text
                key={r.label}
                onPress={() => setRangeIdx(i)}
                style={[styles.rangeChip, i === rangeIdx && styles.rangeChipActive]}
              >
                {r.label}
              </Text>
            ))}
          </View>

          <View style={styles.card}>
            {chartData.length === 0 ? (
              <Text style={styles.emptyChart}>No data in this range</Text>
            ) : skiaStatus === 'unavailable' ? (
              <Text style={styles.emptyChart}>Charts aren't supported in this preview</Text>
            ) : skiaStatus === 'loading' ? (
              <Text style={styles.emptyChart}>Loading chart…</Text>
            ) : (
              <>
                <View style={styles.chartWithAxis}>
                  <View style={styles.yAxis}>
                    <Text style={styles.axisLabel}>{yBounds.max} kg</Text>
                    <Text style={styles.axisLabel}>{Math.round((yBounds.max + yBounds.min) / 2)} kg</Text>
                    <Text style={styles.axisLabel}>{yBounds.min} kg</Text>
                  </View>
                  <View style={styles.chartArea}>
                    <CartesianChart
                      data={chartData}
                      xKey="date"
                      yKeys={['actual', 'expected']}
                      domain={{ y: [yBounds.min, yBounds.max] }}
                    >
                      {({ points }) => (
                        <>
                          <Line points={points.expected} color={colors.textSecondary} strokeWidth={2} connectMissingData>
                            <DashPathEffect intervals={[6, 6]} />
                          </Line>
                          <Line points={points.actual} color={colors.accent} strokeWidth={3} />
                        </>
                      )}
                    </CartesianChart>
                  </View>
                </View>
                <View style={styles.xAxis}>
                  <Text style={styles.axisLabel}>{chartData[0].date}</Text>
                  {chartData.length > 2 && (
                    <Text style={styles.axisLabel}>{chartData[Math.floor((chartData.length - 1) / 2)].date}</Text>
                  )}
                  <Text style={styles.axisLabel}>{chartData[chartData.length - 1].date}</Text>
                </View>
              </>
            )}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendLabel}>Actual</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendSwatchDashed]} />
              <Text style={styles.legendLabel}>Expected</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Starting" value={`${weightTarget.start_value} kg`} style={{ marginRight: 10 }} />
            <StatCard label="Target" value={`${weightTarget.target_value} kg`} style={{ marginRight: 10 }} />
            <StatCard label="Pace" value={pace ? paceLabel[pace] : '—'} pill />
          </View>

          <Button mode="text" onPress={() => navigation.navigate('EditWeightGoal')}>
            Edit goal
          </Button>
        </>
      )}

      <Button mode="contained" onPress={() => setModalOpen(true)} style={{ marginTop: 8 }}>
        Log today's weight
      </Button>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log today's weight</Text>
            <TextInput
              mode="outlined"
              placeholder="kg"
              keyboardType="decimal-pad"
              value={input}
              onChangeText={setInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button onPress={() => setModalOpen(false)}>Cancel</Button>
              <Button mode="contained" onPress={saveWeight}>
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  title: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  currentValue: { fontSize: 34, fontWeight: '700', color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13 },
  emptyChart: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 80 },
  chartWithAxis: { flexDirection: 'row', height: 180 },
  yAxis: { width: 44, justifyContent: 'space-between', paddingVertical: 2 },
  chartArea: { flex: 1 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingLeft: 44 },
  axisLabel: { fontSize: 10, fontWeight: '600', color: colors.textFaint },
  rangeRow: { flexDirection: 'row', gap: 8 },
  rangeChip: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  rangeChipActive: { color: '#fff', backgroundColor: colors.accent, borderColor: colors.accent },
  legendRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 3, borderRadius: 2 },
  legendSwatchDashed: { backgroundColor: colors.textSecondary },
  legendLabel: { fontSize: 12, color: colors.textSecondary },
  statsRow: { flexDirection: 'row' },
  modalBackdrop: { flex: 1, backgroundColor: '#00000055', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
