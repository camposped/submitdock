/**
 * The prompt a person hands their agent to start a pass.
 *
 * It lives in the app rather than in the README because the app knows things
 * the README cannot: which product is selected, and how many directories are
 * actually ready. A prompt that says "your product" and "the first 10" when
 * only four are ready is a prompt someone has to edit before using.
 *
 * No command appears in it. This is text for an agent to read, not an
 * instruction for a person to run, which is the line the UI does not cross.
 */
export function passPrompt({
  productName,
  catalogName,
  take,
}: {
  productName: string
  /** Which list to work. Named in the prompt so a pass is never ambiguous. */
  catalogName: string | null
  take: number
}) {
  const many = take === 1 ? 'the top directory' : `the first ${take} directories`
  const list = catalogName ? ` from the "${catalogName}" catalog` : ''

  return `Read AGENTS.md, then run a submission pass for ${productName}${list}.

Take ${many} that are alive, have a form and nothing blocking, highest
Authority Score first. For each one: open it in Chrome, fill the form from the Product Kit,
submit it, and record the result.

Time every attempt, and screenshot where you ended up whether it worked or
not. The failure screens are the ones worth keeping.

Open a run before you start and close it when you are done, so I can watch it
in the sidebar. Update the step with the domain you are on.

If a directory wants a captcha, an account or a fee, leave it and note why.
Do not mark anything submitted that was not.`
}

/** How many to ask for: ten is a sitting, and never more than exist. */
export function passSize(readyToSend: number) {
  return Math.max(1, Math.min(10, readyToSend))
}
