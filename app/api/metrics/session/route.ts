import { handleApiError } from "../../../lib/apiError";
import { logPageSession } from "../../../lib/metrics";
import { parsePageSessionInput } from "../../../lib/validation";

// Receives time-on-page reports sent by the browser when a visitor leaves a
// page (via navigator.sendBeacon, which cannot read a response body).
export async function POST(request: Request) {
  try {
    const { path, durationSeconds } = parsePageSessionInput(await request.json());

    // Sub-second visits (redirects, instant bounces) would only drag the
    // average towards zero, so they are acknowledged but not stored.
    if (durationSeconds >= 1) {
      await logPageSession(path, durationSeconds);
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
