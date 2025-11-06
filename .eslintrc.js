module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    mocha: true
  },
  extends: [
    'eslint:recommended',
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Code style
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    
    // Best practices
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'no-undef': 'error',
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    
    // ES6+
    'prefer-const': 'error',
    'no-var': 'error',
    'arrow-spacing': 'error',
    'template-curly-spacing': 'error',
    
    // Node.js specific
    'no-process-exit': 'off',
    'handle-callback-err': 'error',
    
    // Relaxed rules for development
    'space-before-function-paren': 'off',
    'comma-dangle': 'off'
  },
  globals: {
    'describe': 'readonly',
    'it': 'readonly',
    'before': 'readonly',
    'after': 'readonly',
    'beforeEach': 'readonly',
    'afterEach': 'readonly'
  }
};