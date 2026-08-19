import { registerRootComponent } from 'expo';

// Imported before the app so the background task exists by the time the OS
// loads this bundle to handle an alarm button press.
import './src/lib/backgroundNotificationTask';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
