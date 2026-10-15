// Shared toJSON transform: expose `id`, hide internals.
export function applyJsonTransform(schema, hidden = []) {
  schema.set('toJSON', {
    versionKey: false,
    transform(doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      for (const key of hidden) {
        const parts = key.split('.');
        let target = ret;
        for (let i = 0; i < parts.length - 1 && target; i += 1) target = target[parts[i]];
        if (target) delete target[parts[parts.length - 1]];
      }
      return ret;
    },
  });
}
