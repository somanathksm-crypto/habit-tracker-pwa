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

/**
 * Extra, manufacturer-specific steps beyond the standard exemption.
 *
 * Several Android skins stack their own app-killers on top of AOSP power
 * management, and none of those screens can be opened reliably from an app —
 * the intents are undocumented and change between versions. So the app names
 * the steps for the phone in hand rather than listing everyone's.
 */
export function extraBatterySteps(): { brand: string; steps: string[] } | null {
  if (!batterySetupSupported) return null;
  const constants = Platform.constants as { Manufacturer?: string; Brand?: string } | undefined;
  const raw = `${constants?.Manufacturer ?? ''} ${constants?.Brand ?? ''}`.toLowerCase();

  if (/xiaomi|redmi|poco/.test(raw)) {
    return {
      brand: 'Xiaomi',
      steps: [
        'Settings → Apps → Habit Tracker → Autostart → turn on',
        'Settings → Apps → Habit Tracker → Battery saver → No restrictions',
        'In recents, drag the app card down to lock it',
      ],
    };
  }
  if (/samsung/.test(raw)) {
    return {
      brand: 'Samsung',
      steps: [
        'Settings → Battery → Background usage limits',
        'Make sure Habit Tracker is NOT in "Sleeping apps" or "Deep sleeping apps"',
        'Turn off "Put unused apps to sleep" — it re-adds apps on its own',
      ],
    };
  }
  if (/oppo|realme|oneplus/.test(raw)) {
    return {
      brand: 'Oppo',
      steps: [
        'Settings → Battery → Battery Optimization → Habit Tracker → Don\'t optimize',
        'Settings → Apps → Habit Tracker → Allow background activity',
        'In recents, lock the app so "clear all" skips it',
      ],
    };
  }
  if (/vivo|iqoo/.test(raw)) {
    return {
      brand: 'Vivo',
      steps: [
        'Settings → Battery → High background power consumption → allow Habit Tracker',
        'Settings → Apps → Autostart → turn on for Habit Tracker',
        'In recents, lock the app',
      ],
    };
  }
  if (/huawei|honor/.test(raw)) {
    return {
      brand: 'Huawei',
      steps: [
        'Settings → Battery → App launch → Habit Tracker → Manage manually',
        'Turn on auto-launch, secondary launch and run in background',
      ],
    };
  }
  return null;
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
