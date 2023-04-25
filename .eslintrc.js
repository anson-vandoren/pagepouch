module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  root: true,
  extends: 'airbnb-base',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-use-before-define': [
      'error', {
        functions: false,
      },
    ],
    'no-plusplus': 0,
    'object-curly-newline': [
      'warn', {
        ObjectExpression: { multiline: true, minProperties: 6 },
        ObjectPattern: { multiline: true, minProperties: 6 },
        ImportDeclaration: { multiline: true, minProperties: 6 },
        ExportDeclaration: { multiline: true, minProperties: 6 },
      },
    ],
  },
};
