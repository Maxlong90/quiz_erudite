// Use the official in-memory AsyncStorage mock for any module that touches it
// (e.g. the premium provider).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
