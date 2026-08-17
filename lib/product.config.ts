// Central product identity, the one-boilerplate convention. SubmitDock runs
// local only, so the hosting and module flags the boilerplate carries have no
// meaning here and are left out rather than filled with fiction.
export const PRODUCT = {
  name: 'SubmitDock',
  slug: 'submitdock',
  tagline: 'Mission control for directory submissions',
  description:
    'The panel I command the submission agent from: campaign state, the agent trail, and the shared directory catalog.',
  devPort: 3007,
} as const
