type PathSegment =
  | { type: 'property'; key: string }
  | { type: 'index'; key: string; index: number }
  | { type: 'arrayIndex'; index: number }
  | { type: 'wildcard'; key: string };

const indexRegex = /^(\w+)\[(\d+)\]$/;
const wildcardRegex = /^(\w+)\[\]$/;
const arrayIndexRegex = /^\d+$/;

function parseSegment(segment: string): PathSegment {
  const indexMatch = segment.match(indexRegex);
  if (indexMatch) {
    return { type: 'index', key: indexMatch[1], index: Number(indexMatch[2]) };
  }

  const wildcardMatch = segment.match(wildcardRegex);
  if (wildcardMatch) {
    return { type: 'wildcard', key: wildcardMatch[1] };
  }

  if (arrayIndexRegex.test(segment)) {
    return { type: 'arrayIndex', index: Number(segment) };
  }

  return { type: 'property', key: segment };
}

export function resolvePath(source: unknown, path: string): unknown {
  if (!path) {
    return source;
  }

  const segments = path.split('.').filter(Boolean).map(parseSegment);
  let current: unknown[] = [source];

  for (const segment of segments) {
    const next: unknown[] = [];
    for (const item of current) {
      if (item === null || item === undefined) {
        continue;
      }
      const typedItem = item as Record<string, unknown>;

      if (segment.type === 'property') {
        next.push(typedItem[segment.key]);
      } else if (segment.type === 'index') {
        const arrayValue = typedItem[segment.key];
        if (Array.isArray(arrayValue)) {
          next.push(arrayValue[segment.index]);
        }
      } else if (segment.type === 'arrayIndex') {
        if (Array.isArray(item)) {
          next.push(item[segment.index]);
        }
      } else {
        const arrayValue = typedItem[segment.key];
        if (Array.isArray(arrayValue)) {
          next.push(...arrayValue);
        }
      }
    }
    current = next;
    if (current.length === 0) {
      return undefined;
    }
  }

  return current.length === 1 ? current[0] : current;
}

type CollectPathsOptions = {
  maxDepth?: number;
  maxPaths?: number;
  maxArrayItems?: number;
};

export function collectPaths(
  source: unknown,
  { maxDepth = 6, maxPaths = 200, maxArrayItems = 3 }: CollectPathsOptions = {}
): string[] {
  const paths = new Set<string>();

  const visit = (value: unknown, currentPath: string, depth: number) => {
    if (paths.size >= maxPaths || depth > maxDepth) {
      return;
    }

    if (value === null || value === undefined) {
      if (currentPath) {
        paths.add(currentPath);
      }
      return;
    }

    if (Array.isArray(value)) {
      const arrayPath = currentPath ? `${currentPath}[]` : '[]';
      if (value.length === 0) {
        paths.add(arrayPath);
        return;
      }
      value.slice(0, maxArrayItems).forEach((item) => {
        visit(item, arrayPath, depth + 1);
      });
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        if (nested === null || nested === undefined || typeof nested !== 'object') {
          paths.add(nextPath);
        } else {
          visit(nested, nextPath, depth + 1);
        }
      });
      return;
    }

    if (currentPath) {
      paths.add(currentPath);
    }
  };

  visit(source, '', 0);
  return Array.from(paths);
}
