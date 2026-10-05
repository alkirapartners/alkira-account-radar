const SIGN_IN_PATH = "/auth.html";

export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Please sign in again.");
    this.name = "SessionExpiredError";
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * nginx answers an API call from an expired session with a redirect to the
 * sign-in page, which fetch follows. So the tell is HTML where JSON or an
 * event stream was expected.
 */
export function isSignInResponse(res: Response): boolean {
  if (res.redirected && res.url.includes(SIGN_IN_PATH)) return true;
  return (res.headers.get("Content-Type") ?? "").includes("text/html");
}

export function goToSignIn(): void {
  window.location.assign(SIGN_IN_PATH);
}
