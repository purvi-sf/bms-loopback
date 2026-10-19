module.exports = {
  extends: '@loopback/eslint-config',
  overrides: [
    {
      files: ['src/patterns/structural/adapter.ts'],
      rules: {'@typescript-eslint/naming-convention': 'off'},
    },
  ],
};
