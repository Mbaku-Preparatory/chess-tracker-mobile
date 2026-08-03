// Central place for reacting to "the backend no longer accepts this token."
// Kept out of graphqlClient.ts/api.ts's module scope (dynamic imports below)
// so it can safely dispatch into the Redux store without creating an
// import cycle with store.ts -> middleware -> graphqlClient.ts.
let loggingOut = false;

export async function handleAuthFailure() {
  if (loggingOut) return;
  loggingOut = true;
  try {
    const { store } = await import("@/redux/store");
    const { clearAuth } = await import("@/redux/actions/auth");
    store.dispatch(clearAuth());
    const { resetToLogin } = await import("@/navigation/navigationRef");
    resetToLogin();
  } finally {
    loggingOut = false;
  }
}
