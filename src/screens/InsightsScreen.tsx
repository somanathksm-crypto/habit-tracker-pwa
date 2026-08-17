import { Area, CartesianChart } from 'victory-native';
import { addDays, addMonths, format, getDaysInMonth, isAfter, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useData } from '../lib/store';
import { globalProgress, monthlyWeekBreakdown } from '../lib/stats';
import { useSkiaStatus } from '../lib/useSkiaReady';
import { colors } from '../theme';
import type { InsightsStackParamList } from '../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<InsightsStackParamList, 'InsightsHub'>;

export function InsightsScreen(_props: Props) {
  const { habits, habitLogs } = useData();
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedIdx, setSelectedIdx] = useState(0);

  const monthWeeks = useMemo(
    () => monthlyWeekBreakdown(habits.length, habitLogs, selectedMonth),
    [habits.length, habitLogs, selectedMonth]
  );
  const global = useMemo(() => globalProgress(habits, habitLogs), [habits, habitLogs]);
  const skiaStatus = useSkiaStatus();

  // Full month (all days, not just the weeks that have started) so the
  // chart's x-axis always spans day 1 to the last day of the month —
  // future days are left with no y-value, so the area just stops instead
  // of stretching what data exists across the whole chart width.
  const dailyChartData = useMemo(() => {
    const completedByDate = new Map<string, number>();
    for (const log of habitLogs) {
      if (!log.completed) continue;
      completedByDate.set(log.log_date, (completedByDate.get(log.log_date) ?? 0) + 1);
    }
    const today = new Date();
    const monthStart = startOfMonth(selectedMonth);
    const daysInMonth = getDaysInMonth(selectedMonth);

    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = addDays(monthStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const future = isAfter(date, today);
      const completed = future ? 0 : (completedByDate.get(dateStr) ?? 0);
      return {
        day: i + 1,
        date: dateStr,
        pct: future || habits.length === 0 ? null : Math.round((completed / habits.length) * 100),
      };
    });
  }, [habitLogs, habits.length, selectedMonth]);

  // Index of the last day that actually has data — where the area chart
  // visually stops. Falls back to the last day of the month if every day
  // has data (nothing left "future").
  const latestDataIdx = useMemo(() => {
    for (let i = dailyChartData.length - 1; i >= 0; i--) {
      if (dailyChartData[i].pct !== null) return i;
    }
    return dailyChartData.length - 1;
  }, [dailyChartData]);

  // Default to the current/latest week whenever the viewed month changes.
  useEffect(() => {
    setSelectedIdx(Math.max(0, monthWeeks.length - 1));
  }, [selectedMonth, monthWeeks.length]);

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  if (habits.length === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.header}>Insights</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add a habit from the Today tab to see your overview here.</Text>
        </View>
      </View>
    );
  }

  const activeIdx = Math.min(selectedIdx, Math.max(0, monthWeeks.length - 1));
  const week = monthWeeks[activeIdx];
  const weekPct = week && week.goal > 0 ? week.completed / week.goal : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Insights</Text>

      <Text style={styles.sectionTitle}>Global progress</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{global.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{global.goal}</Text>
          <Text style={styles.statLabel}>Goal</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{global.left}</Text>
          <Text style={styles.statLabel}>Left</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Overview</Text>
      <View style={styles.monthRow}>
        <Pressable hitSlop={10} onPress={() => setSelectedMonth((m) => addMonths(m, -1))}>
          <Text style={styles.monthArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{format(selectedMonth, 'MMMM yyyy')}</Text>
        <Pressable hitSlop={10} disabled={isCurrentMonth} onPress={() => setSelectedMonth((m) => addMonths(m, 1))}>
          <Text style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}>›</Text>
        </Pressable>
      </View>

      {monthWeeks.length === 0 || !week ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No data for this month yet.</Text>
        </View>
      ) : (
        <>
          <View style={[styles.card, styles.dailyChartCard]}>
            <Text style={styles.dailyChartTitle}>Daily completion — {format(selectedMonth, 'MMMM')}</Text>
            {dailyChartData.length === 0 ? (
              <Text style={styles.emptyChart}>No data yet</Text>
            ) : skiaStatus === 'unavailable' ? (
              <Text style={styles.emptyChart}>Charts aren't supported in this preview</Text>
            ) : skiaStatus === 'loading' ? (
              <Text style={styles.emptyChart}>Loading chart…</Text>
            ) : (
              <>
                <View style={styles.chartWithAxis}>
                  <View style={styles.yAxis}>
                    <Text style={styles.axisLabel}>100%</Text>
                    <Text style={styles.axisLabel}>50%</Text>
                    <Text style={styles.axisLabel}>0%</Text>
                  </View>
                  <View style={styles.chartArea}>
                    <CartesianChart data={dailyChartData} xKey="day" yKeys={['pct']} domain={{ y: [0, 100] }}>
                      {({ points, chartBounds }) => (
                        <Area
                          points={points.pct}
                          y0={chartBounds.bottom}
                          color={colors.accentSoft}
                          curveType="natural"
                        />
                      )}
                    </CartesianChart>
                  </View>
                </View>
                <View style={styles.xAxis}>
                  <Text style={styles.axisLabel}>{format(parseISO(dailyChartData[0].date), 'd')}</Text>
                  <Text style={styles.axisLabel}>{format(parseISO(dailyChartData[latestDataIdx].date), 'd')}</Text>
                  <Text style={styles.axisLabel}>
                    {format(parseISO(dailyChartData[dailyChartData.length - 1].date), 'd')}
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.weekChipRow}>
            {monthWeeks.map((w, i) => (
              <Pressable key={w.label} onPress={() => setSelectedIdx(i)} style={styles.weekChipWrap}>
                <Text numberOfLines={1} style={[styles.weekChip, i === activeIdx && styles.weekChipActive]}>
                  {w.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.chartRow}>
              <View style={[styles.rowLabel, styles.chartYAxis]}>
                <Text style={styles.axisLabel}>100%</Text>
                <Text style={styles.axisLabel}>0%</Text>
              </View>
              {week.days.map((d) => {
                const dayPct = d.goal > 0 ? Math.min(1, d.completed / d.goal) : 0;
                return (
                  <View key={d.date} style={styles.chartCol}>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBarFill,
                          { height: `${Math.round(dayPct * 100)}%` },
                          d.future && styles.chartBarFuture,
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.rowLabel} />
                {week.days.map((d) => (
                  <Text key={d.date} style={[styles.cell, styles.cellHeader]}>
                    {d.label[0]}
                  </Text>
                ))}
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.rowLabel}>Completed</Text>
                {week.days.map((d) => (
                  <Text key={d.date} style={styles.cell}>
                    {d.future ? '–' : d.completed}
                  </Text>
                ))}
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.rowLabel}>Goal</Text>
                {week.days.map((d) => (
                  <Text key={d.date} style={styles.cell}>
                    {d.goal}
                  </Text>
                ))}
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.rowLabel}>Left</Text>
                {week.days.map((d) => (
                  <Text key={d.date} style={styles.cell}>
                    {d.future ? '–' : Math.max(0, d.goal - d.completed)}
                  </Text>
                ))}
              </View>
            </View>

            <Text style={styles.weeklyProgressLabel}>Weekly progress</Text>
            <View style={styles.weeklyProgressRow}>
              <Text style={styles.weeklyProgressValue}>
                {week.completed}/{week.goal}
              </Text>
            </View>
            <Text style={styles.weeklyProgressPct}>{Math.round(weekPct * 100)}% completed</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round(weekPct * 100)}%` }]} />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  statsRow: { flexDirection: 'row' },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  statValue: { fontSize: 19, fontWeight: '700', color: colors.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  monthArrow: { fontSize: 22, color: colors.accent, fontWeight: '700', paddingHorizontal: 18 },
  monthArrowDisabled: { color: colors.textFaint },
  monthLabel: { fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 130, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  dailyChartCard: { marginBottom: 16 },
  dailyChartTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 },
  emptyChart: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 40 },
  chartWithAxis: { flexDirection: 'row', height: 130 },
  yAxis: { width: 34, justifyContent: 'space-between', paddingVertical: 2 },
  chartArea: { flex: 1 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingLeft: 34 },
  axisLabel: { fontSize: 10, fontWeight: '600', color: colors.textFaint },
  weekChipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  weekChipWrap: { marginRight: 8, marginBottom: 8 },
  weekChip: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 150,
    textAlign: 'center',
  },
  weekChipActive: { color: colors.accentInk, backgroundColor: colors.accent, borderColor: colors.accent },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  chartRow: { flexDirection: 'row', height: 140, marginBottom: 12 },
  chartYAxis: { justifyContent: 'space-between', paddingVertical: 2 },
  chartCol: { flex: 1, paddingHorizontal: 3 },
  chartBarTrack: {
    flex: 1,
    borderRadius: 5,
    backgroundColor: colors.accentFaint,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: { width: '100%', backgroundColor: colors.accentMedium, borderRadius: 5 },
  chartBarFuture: { backgroundColor: colors.surfaceMuted },
  table: {},
  tableRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowLabel: { width: 74, fontSize: 11.5, fontWeight: '600', color: colors.textSecondary },
  cell: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
  cellHeader: { color: colors.textFaint, fontSize: 10.5 },
  weeklyProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  weeklyProgressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  weeklyProgressValue: { fontSize: 26, fontWeight: '700', color: colors.text },
  weeklyProgressPct: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
