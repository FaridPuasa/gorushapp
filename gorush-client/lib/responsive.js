import { Dimensions, useWindowDimensions } from 'react-native';

export const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const { width } = useWindowDimensions();
  return width < MOBILE_BREAKPOINT;
}

export function isMobileWidth() {
  return Dimensions.get('window').width < MOBILE_BREAKPOINT;
}
