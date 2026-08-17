import { DashPathEffect } from '@shopify/react-native-skia';
import { CartesianChart, Line } from 'victory-native';
import { addDays, format, isAfter, parseISO, subMonths } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, IconButton, TextInput } from 'react-native-paper';
import { StatCard } from '../components/StatCard';
import { useData } from '../lib/store';
import {
  bestMetricValue,
  expectedWeightOn as expectedValueOn,
  isMetricPersonalRecord,
  metricLoggingStreak,
  todayStr,
  weightPace as trackingPace,
} from '../lib/stats';
import { useSkiaStatus } from '../lib/useSkiaReady';
import { colors } from '../theme';

type Props = {
  route: { params: { metricId: string } };
  navigation: any;
};

const RANGES = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: 'All', months: null as number | null },
];

export function MetricDetailScreen({ route, navigation }: Props) {
  const { metricId } = route.params;
  const { metrics, metricLogs, metricTargets, upsertMetricLog, deleteMetric } = useData();
  const metric = metrics.find((m) => m.id === metricId);
  const target = metricTargets.find((t) => t.metric_id === metricId);
  const skiaStatus = useSkiaStatus();
  const [rangeIdx, setRangeIdx] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [input, setInput] = useState('');

  const sortedLogs = useMemo(
    () => metricLogs.filter((l) => l.metric_id === metricId).sort((a, b) => a.log_date.localeCompare(b.log_date)),
    [metricLogs, metricId]
  );
  const current = sortedLogs[sortedLogs.length - 1];

  const chartData = useMemo(() => {
    if (!target) return [];
    const months = RANGES[rangeIdx].months;
    const cutoff = months ? subMonths(new Date(), months) : parseISO(target.start_date);

    const dateSet = new Set<string>();
    sortedLogs.forEach((l) => {
      if (!isAfter(cutoff, parseISO(l.log_date))) dateSet.add(l.log_date);
    });
    let cursor = isAfter(cutoff, parseISO(target.start_date)) ? cutoff : parseISO(target.start_date);
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
      expected: expectedValueOn(target, d),
    }));
  }, [sortedLogs, target, rangeIdx]);

  const yBounds = useMemo(() => {
    const values = chartData.flatMap((d) => [d.actual, d.expected]).filter((v): v is number => v != null);
    if (values.length === 0) return { min: 0, max: 0 };
    return { min: Math.floor(Math.min(...values)), max: Math.ceil(Math.max(...values)) };
  }, [chartData]);

  if (!metric) {
    return (
      <View style={styles.screen}>
        <Text style={styles.missing}>This metric was deleted.</Text>
      </View>
    );
  }

  const pace = target && current ? trackingPace(target, current.value) : null;
  const paceLabel = { ahead: 'Ahead', 'on-track': 'On track', behind: 'Behind', unknown: '—' };
  const higherIsBetter = metric.higher_is_better ?? true;
  const best = bestMetricValue(sortedLogs, higherIsBetter);
  const streak = metricLoggingStreak(sortedLogs);

  const saveValue = () => {
    const val = parseFloat(input);
    if (!Number.isNaN(val) && val > 0) {
      const priorLogs = sortedLogs.filter((l) => l.log_date !== todayStr());
      const isPR = isMetricPersonalRecord(priorLogs, val, higherIsBetter);
      upsertMetricLog(metricId, todayStr(), val);
      setInput('');
      setModalOpen(false);
      if (isPR) {
        Alert.alert('New personal record!', `${val} ${metric.unit} beats your previous best.`);
      }
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete metric?', `"${metric.name}" and all its history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMetric(metric.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.title}>{metric.name}</Text>
          <Text style={styles.currentValue}>{current ? `${current.value} ${metric.unit}` : '—'}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon="pencil-outline" onPress={() => navigation.navigate('AddEditMetric', { metricId: metric.id })} />
          <IconButton icon="trash-can-outline" iconColor={colors.danger} onPress={confirmDelete} />
        </View>
      </View>

      {best !== null && (
        <View style={styles.statsRow}>
          <StatCard
            label="Best"
            value={`${best} ${metric.unit}`}
            iconName="trophy-outline"
            iconColor={colors.warning}
            infoText="The best value you've ever logged."
            style={{ marginRight: 10 }}
          />
          <StatCard
            label="Streak"
            value={`${streak}`}
            iconName="fire"
            iconColor={colors.clay}
            infoText="Days in a row you've logged a value, counting back from today — independent of any target."
          />
        </View>
      )}

      {!target ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>Set a starting and target value to see your trend.</Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('EditMetricTarget', { metricId })}
            style={{ marginTop: 10 }}
          >
            Set target
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
                    <Text style={styles.axisLabel}>
                      {yBounds.max} {metric.unit}
                    </Text>
                    <Text style={styles.axisLabel}>
                      {Math.round((yBounds.max + yBounds.min) / 2)} {metric.unit}
                    </Text>
                    <Text style={styles.axisLabel}>
                      {yBounds.min} {metric.unit}
                    </Text>
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
            <StatCard label="Starting" value={`${target.start_value} ${metric.unit}`} style={{ marginRight: 10 }} />
            <StatCard label="Target" value={`${target.target_value} ${metric.unit}`} style={{ marginRight: 10 }} />
            <StatCard label="Pace" value={pace ? paceLabel[pace] : '—'} pill />
          </View>

          <Button mode="text" onPress={() => navigation.navigate('EditMetricTarget', { metricId })}>
            Edit target
          </Button>
        </>
      )}

      <Button mode="contained" onPress={() => setModalOpen(true)} style={{ marginTop: 8 }}>
        Log today's value
      </Button>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log today's value</Text>
            <TextInput
              mode="outlined"
              placeholder={metric.unit || 'value'}
              keyboardType="decimal-pad"
              value={input}
              onChangeText={setInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button onPress={() => setModalOpen(false)}>Cancel</Button>
              <Button mode="contained" onPress={saveValue}>
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  missing: { padding: 24, color: colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
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
  yAxis: { width: 54, justifyContent: 'space-between', paddingVertical: 2 },
  chartArea: { flex: 1 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingLeft: 54 },
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
