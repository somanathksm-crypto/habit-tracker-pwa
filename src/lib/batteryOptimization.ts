import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

/**
 * Android power management is the single biggest reason habit alarms don't
 * ring. A phone that "optimises" this app can stop its scheduled alarms
 * entirely, and it fails silently — the reminders look set, nothing happens.
 *
 * Exempting the app is one tap in a system dialog, so the app asks rather than
 * leaving people to find it. Android offers no way to read back whether the
 * exemption was granted, which is why the test alarm exists alongside this.
 */
export const batterySetupSupported = Platform.OS === 'android';

function packageName(): string {
  return (
    (Constants.expoConfig?.android?.package as string | undefined) ?? 'com.habittracker.app'
  );
}

/**
 * Opens the "Allow app to always run in background?" dialog. Falls back to the
 * optimisation list, then to this app's settings page — OEM builds vary in
 * which of these they'll actually honour.
 */
export async function openBatteryOptimizationPrompt(): Promise<boolean> {
  if (!batterySetupSupported) return false;

  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${packageName()}` }
    );
    return true;
  } catch {
    // Some builds refuse the direct request and only allow the list screen.
  }

  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
    );
    return true;
  } catch {
    // Fall through to app details.
  }

  return openAppSettings();
}

/** This app's system settings page — the last resort that always exists. */
export async function openAppSettings(): Promise<boolean> {
  if (!batterySetupSupported) return false;
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
      { data: `package:${packageName()}` }
    );
    return true;
  } catch {
    return false;
  }
}
