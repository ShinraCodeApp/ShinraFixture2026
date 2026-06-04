import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

// Catch unhandled JS errors before ErrorBoundary mounts
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[GLOBAL ERROR]', isFatal ? '[FATAL]' : '', error?.message, error?.stack);
  originalHandler(error, isFatal);
});

// Ignore non-critical warnings in production
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate`',
  'EventEmitter.removeListener',
]);

registerRootComponent(App);
