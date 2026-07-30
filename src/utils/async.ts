export const MIN_LOADING_MS = 1500

export const delay = (milliseconds = MIN_LOADING_MS) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, milliseconds)
})

export async function withMinimumLoading<T>(action: () => T | Promise<T>, milliseconds = MIN_LOADING_MS): Promise<T> {
  // Keep the current loading UI mounted for the full minimum duration before
  // an action is allowed to switch routes, active applications or sessions.
  await delay(milliseconds)
  return action()
}
