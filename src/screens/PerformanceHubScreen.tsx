import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { useData } from '../lib/store';
import { metricLoggingStreak, metricsOverview, weightPace as trackingPace } from '../lib/stats';
import { colors } from '../theme';
import type { PerformanceStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<PerformanceStackParamList, 'PerformanceHub'>;

const PACE_LABEL: Record<string, string> = { ahead: 'Ahead', 'on-track': 'On track', behind: 'Behind', unknown: '—' };

export function PerformanceHubScreen({ navigation }: Props) {
  const { metrics, metricLogs, metricTargets } = useData();
  const overview = metricsOverview(metrics, metricLogs, metricTargets);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Performance</Text>

        {metrics.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overview.tracked}</Text>
              <Text style={styles.statLabel}>Tracked</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overview.onTrack}</Text>
              <Text style={styles.statLabel}>On track</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overview.behind}</Text>
              <Text style={styles.statLabel}>Behind</Text>
            </View>
          </View>
        )}

        {metrics.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No metrics yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button below to start tracking a number toward a goal — reps, time, weight lifted, anything.
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {metrics.map((metric) => {
              const logs = metricLogs
                .filter((l) => l.metric_id === metric.id)
                .sort((a, b) => a.log_date.localeCompare(b.log_date));
              const current = logs[logs.length - 1];
              const target = metricTargets.find((t) => t.metric_id === metric.id);
              const pace = target && current ? trackingPace(target, current.value) : null;
              const streak = metricLoggingStreak(logs);
              return (
                <Pressable
                  key={metric.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('MetricDetail', { metricId: metric.id })}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.cardName}>{metric.name}</Text>
                      {streak > 0 && (
                        <View style={styles.streakChip}>
                          <Text style={styles.streakEmoji}>🔥</Text>
                          <Text style={styles.streakText}>{streak}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardValue}>{current ? `${current.value} ${metric.unit}` : 'No entries yet'}</Text>
                  </View>
                  {pace && (
                    <View style={styles.pacePill}>
                      <Text style={styles.pacePillText}>{PACE_LABEL[pace]}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        label="Add metric"
        style={styles.fab}
        color="#fff"
        onPress={() => navigation.navigate('AddEditMetric', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 100, gap: 8 },
  header: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
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
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  cardList: { gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardValue: { fontSize: 13, color: colors.textSecondary },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.claySoft,
    borderRadius: 8,
    minWidth: 23,
    height: 23,
    paddingHorizontal: 8,
    marginLeft: 10,
  },
  streakEmoji: { fontSize: 14, marginRight: 3 },
  streakText: { fontSize: 14, fontWeight: '700', color: colors.clay },
  pacePill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 10,
  },
  pacePillText: { fontSize: 12, fontWeight: '700', color: colors.accent, minWidth: 60, textAlign: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: colors.accent },
});
