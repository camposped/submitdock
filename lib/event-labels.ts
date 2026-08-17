/**
 * Event actions, said in words.
 *
 * The action column holds machine names like `verify.backlink_missing`. Those
 * are keys, not sentences, and printing one at a person is the same mistake as
 * showing a primary key. Everything that reaches a screen goes through here.
 */
const LABELS: Record<string, string> = {
  'seed.source': 'Imported a catalog source',
  'seed.done': 'Finished seeding the catalog',
  'catalog.export': 'Exported the catalog',
  'catalog.import': 'Imported a catalog file',
  'directory.edited': 'Edited a directory',
  'submission.state': 'Changed a submission state',
  'submission.listing_url': 'Saved a listing URL',
  'submission.notes': 'Left a note on a submission',
  'submission.backlink': 'Recorded a backlink by hand',
  'submission.edited': 'Updated a submission',
  'verify.backlink_live': 'Confirmed a backlink',
  'verify.backlink_missing': 'Found no link on a listing',
  'verify.unreachable': 'Could not open a listing page',
  'verify.done': 'Finished a verification pass',
  'product.created': 'Created a product',
  'product.overwritten': 'Overwrote a product',
  'product.edited': 'Edited the product kit',
  'product.asset_added': 'Uploaded a brand file',
  'product.asset_removed': 'Removed a brand file',
  'product.asset_linked': 'Linked a brand file',
  'run.started': 'Started a run',
  'run.finished': 'Finished a run',
}

/**
 * Falls back to the action with its punctuation softened, so a new action name
 * added by a script still reads as words rather than as a crash.
 */
export function eventLabel(action: string): string {
  if (LABELS[action]) return LABELS[action]
  const words = action.replace(/[._]/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
