/**
 * Soft-delete plugin.
 *
 * An audit platform must never lose a record silently: a deleted finding or
 * piece of evidence is itself evidence. Records are therefore tombstoned with
 * `deletedAt` instead of being removed, and every read path filters them out
 * via `shared/scope.js` (orgFilter / byIdQuery both add `deletedAt: null`).
 *
 * Use `Model.softDelete(filter, actor)` in place of `findOneAndDelete`.
 */
function softDeletePlugin(schema) {
  schema.add({
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null },
  });

  /**
   * Tombstone one document. Returns the updated doc, or null when nothing
   * matched — so callers keep their existing "not found" behaviour.
   */
  schema.statics.softDelete = function (filter, actor = {}) {
    return this.findOneAndUpdate(
      { ...filter, deletedAt: null },
      { deletedAt: new Date(), deletedBy: actor.userId || null },
      { new: true }
    );
  };

  /** Restore a tombstoned document (admin recovery path). */
  schema.statics.restore = function (filter) {
    return this.findOneAndUpdate(
      { ...filter, deletedAt: { $ne: null } },
      { deletedAt: null, deletedBy: null },
      { new: true }
    );
  };
}

module.exports = softDeletePlugin;
