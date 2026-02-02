// Jest Setup File
// This file runs before each test file

// Mock react-native-reanimated only if it's installed
let hasReanimated = false;
try {
  require.resolve('react-native-reanimated');
  hasReanimated = true;
} catch (e) {
  hasReanimated = false;
}

if (hasReanimated) {
  jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
  });
}
