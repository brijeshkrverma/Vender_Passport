/**
 * ANSWER TREE — immutable path operations over the nested answer structure.
 *
 * No React, no fetch: these are pure functions so the reducer, the future
 * import/migration tool and the tests all drive the same code.
 *
 * A path is an array of keys and indices, e.g.
 *   ['answers', 0, 'subAnswers', 2, 'subScore']
 *
 * Why path-based rather than a handler per field: the Angular version wrote a
 * separate method for each level (`skills()`, `subanswar(i)`, `addSubAnswer(i)`,
 * `removeSubSkill(i, j)`), which is why it stops dead at two levels of nesting.
 * A third level would have meant a third set of methods and a third set of
 * template bindings. These four functions handle any depth.
 */

let seq = 0;
/** Stable client-side key for list rendering. Never sent to the server. */
export function nextKey(prefix = 'k') {
  seq += 1;
  return `${prefix}_${seq}`;
}

/** Read the value at `path`, or `undefined` if any step is missing. */
export function getAt(root, path) {
  let cur = root;
  for (const step of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[step];
  }
  return cur;
}

/** Shallow-clone whichever container type `node` is. */
function cloneNode(node) {
  return Array.isArray(node) ? node.slice() : { ...node };
}

/**
 * Return a copy of `root` with `path` set to `value`.
 * Only the nodes along the path are cloned, so unrelated subtrees keep their
 * identity and React can skip re-rendering them.
 */
export function setAt(root, path, value) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const copy = cloneNode(root);
  copy[head] = rest.length === 0 ? value : setAt(root[head], rest, value);
  return copy;
}

/** Append `item` to the array at `path`. */
export function pushAt(root, path, item) {
  const list = getAt(root, path) || [];
  return setAt(root, path, [...list, item]);
}

/** Remove index `index` from the array at `path`. */
export function removeAt(root, path, index) {
  const list = getAt(root, path) || [];
  return setAt(root, path, list.filter((_, i) => i !== index));
}

/** Move an item inside the array at `path`. Out-of-range moves are ignored. */
export function moveAt(root, path, from, to) {
  const list = getAt(root, path) || [];
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return root;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return setAt(root, path, next);
}

/**
 * Walk every answer and sub-answer, deepest last.
 * Used by the validator and the serializer so neither hardcodes "two levels".
 */
export function walkAnswers(answers, visit, basePath = ['answers']) {
  (answers || []).forEach((answer, index) => {
    const path = [...basePath, index];
    visit(answer, path, index);
    if (Array.isArray(answer.subAnswers) && answer.subAnswers.length) {
      walkAnswers(answer.subAnswers, visit, [...path, 'subAnswers']);
    }
  });
}
