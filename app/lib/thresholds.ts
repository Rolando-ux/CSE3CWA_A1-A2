// Alert thresholds shared by the stats API (which raises the alerts) and the
// dashboard (which explains them). Kept free of server imports so client
// components can use it without pulling the database into the browser bundle.

/** Days of history behind the "recent" failure-rate alert. */
export const RECENT_WINDOW_DAYS = 7;

/** Failure rate (%) above which the dashboard warns. */
export const FAILURE_RATE_WARNING_PCT = 15;

/** Fewer attempts than this make a failure rate too noisy to alert on. */
export const FAILURE_RATE_MIN_ATTEMPTS = 10;

/** Rejected-input count in 24 hours that triggers the invalid-data warning. */
export const VALIDATION_ERRORS_WARNING = 5;
