import { Platform } from 'react-native';

/**
 * Android's system navigation bar sits on top of the app: the platform forces
 * edge-to-edge drawing from API 35 and React Native reports the window at full
 * screen height, so the overlap cannot be measured from JS.
 *
 * The alternatives were worse: `react-native-safe-area-context` needs a native
 * codegen path that exceeds Windows' 260-character limit in this project, and
 * opting out of edge-to-edge is ignored on Android 16+.
 *
 * 48dp is the tallest common navigation bar (three-button), so reserving it can
 * never overlap; gesture handles are shorter and simply gain a little air.
 */
const ANDROID_NAV_BAR = 48;

export function useBottomInset(): number {
  return Platform.OS === 'android' ? ANDROID_NAV_BAR : 0;
}
