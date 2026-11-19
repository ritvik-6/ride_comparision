import { Alert, Linking } from 'react-native';

import type { Place, RideProvider } from '@/types';
import {
  buildProviderLink,
  getLinkHost,
  PROVIDER_LINK_DISCLOSURE,
} from './providerLinks';

/**
 * Hands the trip off to the provider's own platform.
 *
 * Two steps keep this honest: a confirmation dialog stating that the real fare
 * is confirmed in the provider's app, then `Linking.openURL` on an HTTPS URL.
 * `Linking.canOpenURL` is intentionally not used as a gate — Android 11 package
 * visibility can report false for HTTPS links that a browser would still open —
 * so failures are caught from `openURL` instead.
 */

const confirmContinue = (providerName: string): Promise<boolean> =>
  new Promise((resolve) => {
    Alert.alert(
      `Continue to ${providerName}?`,
      PROVIDER_LINK_DISCLOSURE,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: `Continue to ${providerName}`,
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

export interface OpenProviderLinkInput {
  provider: RideProvider;
  pickup: Place;
  destination: Place;
}

/** Never throws: every failure ends in a user-facing message. */
export async function openProviderLink({
  provider,
  pickup,
  destination,
}: OpenProviderLinkInput): Promise<void> {
  const link = buildProviderLink({ provider, pickup, destination });

  const confirmed = await confirmContinue(link.name);

  if (!confirmed) {
    return;
  }

  try {
    await Linking.openURL(link.url);
  } catch {
    Alert.alert(
      `Couldn't open ${link.name}`,
      `We couldn't open ${link.name} on this device. Check your connection and try again, or visit ${getLinkHost(link.url)} in your browser.`,
    );
  }
}
