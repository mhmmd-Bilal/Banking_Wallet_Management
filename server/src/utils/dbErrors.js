export function isDuplicateKey(err, field) {
  if (!err || err.code !== 11000) return false;
  if (!field) return true;
  const keys = Object.keys(err.keyPattern || err.keyValue || {});
  return keys.includes(field);
}
