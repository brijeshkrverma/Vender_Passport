import GridBuilder from '../../components/GridBuilder';

/**
 * THE UI HALF OF THE TYPE CONTRACT.
 *
 * Split from `../index.js` because that half is pure — the serializer, the
 * validator and the reference resolver all import it, and none of them may
 * import React.
 *
 * Keyed by the same id, so a type is one entry here and one file there.
 * A type with no configuration has no editor: `Text` and `CheckBox` are fully
 * described by their label and input mode, and rendering an empty panel for
 * them would be worse than rendering nothing.
 */
const EDITORS = {
  Grid: GridBuilder,
};

/** The authoring editor for a type's configuration, or null if it has none. */
export const getTypeEditor = (id) => EDITORS[id] || null;

/** Does this type draw a configuration panel? */
export const typeHasEditor = (id) => !!EDITORS[id];
