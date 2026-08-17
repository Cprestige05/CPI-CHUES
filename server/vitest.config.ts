import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    isolate: true,          // module + DB isolés par fichier de test
    fileParallelism: false, // séquentiel : Argon2id est coûteux en mémoire/CPU
    testTimeout: 30_000,
    include: ['tests/**/*.test.ts'],
  },
});
