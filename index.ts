import { registerRootComponent } from 'expo';
import * as Sentry from '@sentry/react-native';

import App from './App';
import { initSentry } from './src/lib/monitoring';

// Started before App is imported so a crash while the app is still wiring
// itself up is still reported. Anything later would miss exactly the startup
// failures that are hardest to reproduce from a bug report.
initSentry();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
//
// Sentry.wrap adds the error boundary and touch/navigation breadcrumbs that
// turn "it crashed" into "it crashed after they tapped this".
registerRootComponent(Sentry.wrap(App));
