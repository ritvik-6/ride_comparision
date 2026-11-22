import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the on-screen keyboard, in dp.
 *
 * Android has been edge-to-edge by default since Expo SDK 54, and there
 * `windowSoftInputMode=adjustResize` no longer shrinks the window. Nothing
 * moves on its own, so the floating search sheet would sit behind the keyboard:
 * the rider types into an input they cannot see and the suggestion list is
 * unreachable. Reading the keyboard's own height and lifting the sheet by that
 * much is dependency-free and works on every API level.
 *
 * Returns 0 when no keyboard is showing, and 0 on web.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    // Android only reports the settled geometry reliably after the animation.
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) => {
      setInset(Math.max(0, Math.round(event.endCoordinates.height)));
    });
    const hide = Keyboard.addListener(hideEvent, () => setInset(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
