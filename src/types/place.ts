/** A place shown in the trip search UI, such as a saved or recent destination. */
export interface Place {
  id: string;
  name: string;
  address: string;
}

/** The two route inputs that support location search. */
export type LocationField = 'pickup' | 'destination';

/** Everything the search card needs to render one location field. */
export interface LocationSearchState {
  /** Text currently in the input. */
  query: string;
  /** The chosen place, cleared whenever the text is edited. */
  place: Place | null;
  /** Whether the input is focused, which controls the suggestion panel. */
  focused: boolean;
  /** Matching places for the current query. */
  suggestions: readonly Place[];
  /** Convenience flag for the "selected" affordance in the input. */
  isSelected: boolean;
}
