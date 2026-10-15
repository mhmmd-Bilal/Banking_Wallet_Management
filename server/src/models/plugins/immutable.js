// Blocks updates and deletes of existing documents through Mongoose.
// Used for Transaction and AuditLog: records can be created, never edited or removed
// through normal application code (and no API route exposes such operations).
export function makeImmutable(schema, label) {
  const fail = () => {
    throw new Error(`${label} records are immutable`);
  };
  schema.pre('save', function blockResave(next) {
    if (!this.isNew) return next(new Error(`${label} records are immutable`));
    return next();
  });
  const queryOps = [
    'updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace',
    'deleteMany', 'findOneAndDelete',
  ];
  queryOps.forEach((op) => schema.pre(op, fail));
  schema.pre('deleteOne', { document: false, query: true }, fail);
  schema.pre('deleteOne', { document: true, query: false }, fail);
}
