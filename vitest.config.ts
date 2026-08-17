import { defineConfig } from 'vitest/config';

// Tests FRONTEND uniquement. Le backend a sa propre configuration et son
// isolation (base + stockage temporaires) dans server/vitest.config.ts ;
// il se lance séparément via `pnpm --dir server test`.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['server/**', 'node_modules/**', 'dist/**'],
  },
});
