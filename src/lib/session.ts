/**
 * Who is signed in, and which workspace they're in.
 *
 * These are set once, before the app renders, by the boot screen, and only
 * change by reloading (sign-out reloads). Because the app never renders
 * without them, code can read them like constants. They are live ES module
 * bindings, so importers always see the current value.
 */
export let ME = ''
export let WORKSPACE_ID = ''
export let USER_ID = ''

export function setSession(s: { actorId: string; workspaceId: string; userId: string }) {
  ME = s.actorId
  WORKSPACE_ID = s.workspaceId
  USER_ID = s.userId
}
