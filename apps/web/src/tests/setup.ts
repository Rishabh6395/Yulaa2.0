/// <reference types="vitest/globals" />
// Global test setup - suppress console noise
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
