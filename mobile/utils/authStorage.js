import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'sky_opticles_auth_token';

export async function saveToken(token) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function loadToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}