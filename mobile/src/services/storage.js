/**
 * DOCUMIND-AI Mobile Secure Storage
 * Uses Expo SecureStore for security-sensitive JWT tokens,
 * with graceful AsyncStorage fallback for development & web environments.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore = null;
try {
  SecureStore = require('expo-secure-store');
} catch (_) {
  // Expo SecureStore native module not available in standard web preview
}

const TOKEN_KEY = 'documind_auth_token';
const USER_KEY = 'documind_user_data';

export const saveAuthToken = async (token) => {
  try {
    if (SecureStore && (await SecureStore.isAvailableAsync())) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  } catch (err) {
    console.warn('Could not save token securely, using fallback:', err);
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
};

export const getAuthToken = async () => {
  try {
    if (SecureStore && (await SecureStore.isAvailableAsync())) {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) return token;
    }
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.warn('Could not read token securely, using fallback:', err);
    return await AsyncStorage.getItem(TOKEN_KEY);
  }
};

export const removeAuthToken = async () => {
  try {
    if (SecureStore && (await SecureStore.isAvailableAsync())) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.warn('Could not delete token securely:', err);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
};

export const saveLocalUser = async (user) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Could not save user data:', err);
  }
};

export const getLocalUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

export const clearLocalStorage = async () => {
  await removeAuthToken();
  await AsyncStorage.removeItem(USER_KEY);
};

export default {
  saveAuthToken,
  getAuthToken,
  removeAuthToken,
  saveLocalUser,
  getLocalUser,
  clearLocalStorage,
};
