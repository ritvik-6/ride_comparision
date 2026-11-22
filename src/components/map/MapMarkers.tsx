import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

/**
 * Map markers.
 *
 * The two are deliberately different shapes, not just different colours: a
 * hollow green ring for pickup and a dark flag bubble for destination, so they
 * stay distinguishable for colour-blind riders and on busy map tiles.
 */

export interface MarkerAppearanceProps {
  /** True when this marker is the field currently being edited. */
  selected?: boolean;
}

export function PickupMarker({ selected = false }: MarkerAppearanceProps) {
  return (
    <View
      accessible={false}
      style={[styles.pickupHalo, selected && styles.selectedHalo]}
    >
      <View style={styles.pickupRing}>
        <View style={styles.pickupDot} />
      </View>
    </View>
  );
}

/**
 * Shown at the tapped point while its address is being resolved.
 *
 * The pin has to move the moment the rider taps: waiting for the geocoder leaves
 * the screen looking unresponsive when the lookup is slow or offline.
 */
export function PendingMarker() {
  return (
    <View accessible={false} style={styles.pendingHalo}>
      <View style={styles.pendingRing} />
    </View>
  );
}

export function DestinationMarker({ selected = false }: MarkerAppearanceProps) {
  return (
    <View
      accessible={false}
      style={[styles.destinationHalo, selected && styles.selectedHalo]}
    >
      <View style={styles.destinationBubble}>
        <Ionicons name="flag" size={15} color={colors.textInverse} />
      </View>
    </View>
  );
}

const HALO = 46;

const styles = StyleSheet.create({
  pickupHalo: {
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  destinationHalo: {
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  // A soft accent wash shows which location a tap or search will replace.
  selectedHalo: {
    backgroundColor: 'rgba(15, 169, 104, 0.18)',
  },
  pickupRing: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.accent,
    elevation: 4,
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  pendingHalo: {
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15, 169, 104, 0.16)',
  },
  pendingRing: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    elevation: 4,
    shadowColor: colors.black,
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  destinationBubble: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md + 2,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.surface,
    elevation: 5,
    shadowColor: colors.black,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
