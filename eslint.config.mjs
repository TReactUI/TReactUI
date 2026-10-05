// This file is YOURS. mnci writes it once and never touches it again, so
// anything you add here survives `mnci upgrade`.
//
// The rules live in ./eslint.config.mnci.mjs, which mnci DOES rewrite on every
// upgrade — so put your changes here, not there.
import mnci from './eslint.config.mnci.mjs'

export default [
  ...mnci({
    verticalSlices: {
      files: ['packages/*/src/**/*.{ts,tsx}', 'apps/demo/src/**/*.{ts,tsx}'],
      roles: ['style', 'hook', 'mock', 'fixture'],
    },
  }),
  {
    // `TTY` is the library's public name, chosen by the author; it is an acronym, not PascalCase.
    name:  'local/tty-component-name',
    files: ['packages/tty/src/**/*.tsx', 'apps/demo/src/**/*.tsx'],
    rules: { '@stylistic/jsx-pascal-case': ['error', { allowAllCaps: true }] },
  },
  {
    ignores: [
      '**/vite.config.*.timestamp*',
    ],
  },
]
