module.exports = {
  extends: '@loopback/eslint-config',
  overrides: [
    {
      // security-info response keys mirror OWASP IDs (A01_Broken_Access_Control)
      files: ['src/controllers/auth.controller.ts'],
      rules: {'@typescript-eslint/naming-convention': 'off'},
    },
  ],
};
