# Step S17 – Export Result & Retry

Step S17 lets editors fetch completed export artifacts and recover from failed or cancelled runs while keeping the queue disciplined.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/export/{jobId}/result` | Return the signed URL for the completed export. |
| `POST` | `/api/export/{jobId}/retry` | Requeue a `failed` or `cancelled` export job (max 3 retries). |

## Result availability

- The result endpoint returns `200` with `{ resultUrl }` once the export job status is `completed` and the CDN URL is populated.
- Calling it earlier responds with `400` and an explanation (`Export job is not ready yet`).
- Only workspace members can retrieve the result; we still enforce the existing `workspaceAccessService.assertMember` guard.

## Retry semantics

- Retries are only allowed when the current status is `failed` or `cancelled`. Pending/processing/completed jobs reject the attempt with `400`.
- Each retry increments the `retryCount` column (schema adds `retry_count INT DEFAULT 0`), resets `status` to `pending`, and clears `resultUrl`/`errorMessage`.
- A background timer finishes the job after ~1 second, emits `export.completed`, and lets the consumer observe the updated `resultUrl`.
- Hitting the 3-retry cap still returns `400` (`Retry limit reached`) so a client can back off. The `export.retry` audit event records the membership, format, and next `retryCount`.

## Tests

1. `/export/{jobId}/result` throws `400` until completion and then returns the CDN URL once ready.
2. Cancelling/failing a job and POSTing `/retry` resets it to `pending`, reprocesses it, and increments `retryCount`.
3. Calling `/retry` after three attempts (or while still running) returns `400` with a helpful message.
