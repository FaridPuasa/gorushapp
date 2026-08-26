import Constants from 'expo-constants';
import axios from 'axios';
import { Platform } from 'react-native';

// Web builds are served from the same Heroku app as the API, so requests can
// stay relative to the current origin - no environment-specific URL needed,
// and it avoids baking a dev-only LAN address into a public production
// bundle (app.json's apiBaseUrl is a local machine IP for testing on a
// physical device via Expo Go). Native builds still need an absolute URL -
// update app.json's apiBaseUrl to the real API host before shipping those.
export const BASE_URL = Platform.OS === 'web' ? '' : Constants.expoConfig.extra.apiBaseUrl;

export const api = axios.create({ baseURL: BASE_URL });
