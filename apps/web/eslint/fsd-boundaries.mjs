import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const LAYERS = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];
const SLICED_LAYERS = new Set(['entities', 'features', 'widgets', 'pages']);

function location(filename) {
  const parts = relative(sourceRoot, filename).replaceAll('\\', '/').split('/');
  const [layer, slice] = parts;
  const rank = LAYERS.indexOf(layer);
  return rank < 0 ? null : { layer, slice, rank, parts };
}

function publicEntry(target) {
  if (SLICED_LAYERS.has(target.layer)) {
    return { depth: 2, path: `@/${target.layer}/${target.slice}` };
  }
  if (target.layer === 'shared' && target.slice === 'api') {
    return { depth: 2, path: '@/shared/api' };
  }
  if (target.layer === 'shared' && target.slice === 'lib') {
    return { depth: 3, path: `@/shared/lib/${target.parts[2]}` };
  }
  return null;
}

export default {
  rules: {
    boundaries: {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          upward: '{{from}} cannot import the higher layer {{to}}.',
          sibling: 'Slices on the {{layer}} layer must be independent: {{from}} → {{to}}.',
          private: 'Import through the public entry point {{entry}}, not private modules.',
          self: 'Inside a slice, import the needed module directly instead of its own index.',
          outside: 'Frontend modules must belong to an FSD layer inside src.',
        },
      },
      create(context) {
        const source = location(context.filename);

        function check(node) {
          const value = node.source?.value;
          if (!source || typeof value !== 'string') return;
          const targetPath = value.startsWith('@/')
            ? resolve(sourceRoot, value.slice(2))
            : value.startsWith('.')
              ? resolve(dirname(context.filename), value)
              : null;
          if (!targetPath) return;
          const target = location(targetPath);
          if (!target) {
            context.report({ node, messageId: 'outside' });
            return;
          }
          if (target.rank > source.rank) {
            context.report({
              node,
              messageId: 'upward',
              data: { from: source.layer, to: target.layer },
            });
            return;
          }
          const isSameSlice = source.layer === target.layer && source.slice === target.slice;
          if (source.layer === target.layer && SLICED_LAYERS.has(source.layer) && !isSameSlice) {
            context.report({
              node,
              messageId: 'sibling',
              data: {
                layer: source.layer,
                from: source.slice,
                to: target.slice,
              },
            });
            return;
          }
          const entry = publicEntry(target);
          if (!entry) return;
          const isIndex =
            target.parts.length === entry.depth ||
            (target.parts.length === entry.depth + 1 &&
              /^index(?:\.[cm]?[jt]sx?)?$/.test(target.parts.at(-1)));
          if (isSameSlice && SLICED_LAYERS.has(source.layer) && isIndex) {
            context.report({ node, messageId: 'self' });
          } else if (source.layer !== target.layer && !isIndex) {
            context.report({ node, messageId: 'private', data: { entry: entry.path } });
          }
        }

        return {
          ImportDeclaration: check,
          ExportNamedDeclaration: check,
          ExportAllDeclaration: check,
        };
      },
    },
  },
};
