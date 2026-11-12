// What an error says to the browser. Errors we raise on purpose (HttpError, status below 500) keep
// their plain message. An unexpected error (500) can carry internals, such as a database or RPC
// host, so the public deploy shows a safe sentence and the details stay in the server log.

export const SAFE_500 = "Something went wrong on our side. Please try again in a minute.";

export function clientError(status: number, message: string | undefined, isPublic: boolean): string {
  if (status >= 500 && isPublic) return SAFE_500;
  return message || "Internal error";
}
