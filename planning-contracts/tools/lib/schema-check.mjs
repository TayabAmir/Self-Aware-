/**
 * A small JSON Schema checker covering the subset used by
 * planning-contract.schema.json: type, required, properties,
 * additionalProperties, items, minItems, enum, pattern, $ref, definitions.
 * Deliberately dependency-free — this repo holds specifications, not a build.
 */

const typeOf = (v) => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
};

const typeMatches = (v, t) => {
  if (Array.isArray(t)) return t.some((x) => typeMatches(v, x));
  const actual = typeOf(v);
  if (t === 'number') return actual === 'number' || actual === 'integer';
  if (t === 'integer') return actual === 'integer';
  return actual === t;
};

export function checkSchema(schema, data, { root = schema, at = '' } = {}) {
  const errors = [];
  const push = (msg) => errors.push({ path: at || '(root)', message: msg });

  if (schema.$ref) {
    const ref = schema.$ref.replace(/^#\//, '').split('/');
    let target = root;
    for (const seg of ref) target = target?.[seg];
    if (!target) {
      push(`unresolvable $ref ${schema.$ref}`);
      return errors;
    }
    return checkSchema(target, data, { root, at });
  }

  for (const key of ['oneOf', 'anyOf']) {
    if (!schema[key]) continue;
    const branches = schema[key].map((sub) => checkSchema(sub, data, { root, at }));
    const ok = branches.filter((b) => b.length === 0).length;
    if (ok === 0) {
      push(`matches none of the ${key} branches; closest: ${branches.sort((a, b) => a.length - b.length)[0].map((e) => e.message).join('; ')}`);
      return errors;
    }
    if (key === 'oneOf' && ok > 1) push(`matches ${ok} oneOf branches, expected exactly one`);
  }

  if (schema.enum && !schema.enum.includes(data)) {
    push(`must be one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(data)}`);
    return errors;
  }

  if (schema.type && !typeMatches(data, schema.type)) {
    push(`expected ${JSON.stringify(schema.type)}, got ${typeOf(data)}`);
    return errors;
  }

  if (schema.pattern && typeof data === 'string') {
    if (!new RegExp(schema.pattern).test(data)) {
      push(`"${data}" does not match ${schema.pattern}`);
    }
  }

  if (typeOf(data) === 'array') {
    if (schema.minItems != null && data.length < schema.minItems) {
      push(`needs at least ${schema.minItems} item(s), has ${data.length}`);
    }
    if (schema.items) {
      data.forEach((item, i) => {
        errors.push(...checkSchema(schema.items, item, { root, at: `${at}[${i}]` }));
      });
    }
  }

  if (typeOf(data) === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in data)) push(`missing required property "${key}"`);
    }
    const props = schema.properties ?? {};
    for (const [key, value] of Object.entries(data)) {
      if (props[key]) {
        errors.push(...checkSchema(props[key], value, { root, at: at ? `${at}.${key}` : key }));
      } else if (schema.additionalProperties === false) {
        push(`unexpected property "${key}"`);
      }
    }
  }

  return errors;
}
