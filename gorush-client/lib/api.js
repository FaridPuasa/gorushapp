import Constants from 'expo-constants';
import axios from 'axios';

export const BASE_URL = Constants.expoConfig.extra.apiBaseUrl;

export const api = axios.create({ baseURL: BASE_URL });
