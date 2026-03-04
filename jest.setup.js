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

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
  orderBy: jest.fn((...args) => args),
  limit: jest.fn((...args) => args),
  getDocs: jest.fn(async () => ({ docs: [] })),
  serverTimestamp: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })),
}));
