interface ApiErrorBody {
  message?: unknown;
  error?: unknown;
}

export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.text().catch(() => "");
  if (!body.trim()) return fallback;

  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === "object" && parsed !== null) {
      const error = parsed as ApiErrorBody;
      if (typeof error.message === "string" && error.message.trim()) {
        return error.message;
      }
      if (typeof error.error === "string" && error.error.trim()) {
        return error.error;
      }
    }
  } catch {
    // Plain-text API errors are already suitable for display.
  }

  return body;
}
