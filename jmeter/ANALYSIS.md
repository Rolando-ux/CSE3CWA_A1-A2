# Load test analysis

What the JMeter results say about how the Phoneme Activity Builder behaves as the
number of users grows. The full tables are in [RESULTS.md](RESULTS.md); the
interactive JMeter reports are produced locally in `jmeter/results/x<users>/report/index.html`
(git-ignored because of their size).

## What was tested

Each virtual user runs two workflows with a 300 ms think time between requests:

- **Builder workflow:** load the Wordle page, the word lists and the activities,
  then create an activity and delete it again (database writes).
- **Generation workflow:** generate a file from a saved activity (one database
  write to log the attempt), check `/health`, and load the dashboard figures
  (`/api/stats`).

That is 8 requests per loop. Every response is checked, not just its status code:
a generated file must contain `<!DOCTYPE html>`, `/health` must say `ok`, and so on.
Each level ran against a **production build** with a **fresh seeded database**.

Levels: **x1, x10, x100, x1,000 and x10,000 virtual users.**

## Results at a glance

| Users | Errors | Mean | 95th percentile | Throughput | Server CPU (one core) |
|---:|---:|---:|---:|---:|---:|
| 1 | 0% | 9 ms | 16 ms | 3 req/s | 10% |
| 10 | 0% | 8 ms | 17 ms | 29 req/s | 29% |
| 100 | 0% | 239 ms | 359 ms | 153 req/s | 100% |
| 1,000 | 30.0% | 2,366 ms | 4,708 ms | 216 req/s | 109% |
| 10,000 | 88.0% | 369 ms* | 2,222 ms | 964 req/s* | 107% |

\* Mostly instant failures, so these two figures look better than they are. See below.

## How it behaved

**x1 and x10: comfortable.** Every request answered in under 60 ms with no errors.
The slowest request type, the dashboard figures, took about 14 ms. The server used
about a tenth to a third of one CPU core.

**x100: the first limit.** Still no errors, but the mean jumped from 8 ms to
239 ms and the server's CPU reached **100% of one core**. The important detail is
that **every endpoint slowed down by the same amount**: the cheap `/health` check
went from 5 ms to 238 ms, the same as the heavy dashboard request. That is the
signature of requests queuing for the same resource, not of one slow query.

**x1,000: overload with recovery.** Peak concurrency reached about 950 users.
30% of requests failed, and they all failed the same way: **"Connection
refused", after about 1 ms**. Requests that did get through had a mean of 2.4 s
and a 95th percentile of 4.7 s. The failures came in **two bursts, with none in
between**: 3,365 of 5,053 requests failed in the busiest 10-second window, yet
none of the 4,741 requests in the 30 seconds from 40 s to 70 s failed. The server
recovered by itself once the surge passed.

**x10,000: sustained refusal.** 88% of requests were refused, again within about
1 ms. The median time of 1 ms and the high throughput come from those instant
refusals, not from the app being fast. Only 1,210 of the 10,000 generation
requests were answered.

## Why

The evidence points to one cause: **the application runs on a single CPU core, and
once that core is saturated it cannot accept new connections fast enough.**

- At x100 and above the server sits at about 100% of one core
  (Node.js runs the application on one thread; the SQLite driver is synchronous).
- The server's memory stayed under 460 MB, so it was **not memory-bound**.
- The server's error log was **empty** at every level: no crashes, no exceptions.
- Every failure was a refused connection rather than a slow or error response.
  The most likely explanation is that the operating system's queue of waiting
  connections filled up while the server was busy. I did not measure that queue
  directly, so this part is an inference from the symptoms.
- The database was **not** the bottleneck: there were no lock errors, even with
  creates, deletes and log writes running concurrently.

## Data stayed correct under overload

| | x1,000 | x10,000 |
|---|---:|---:|
| Generate requests the app answered | 1,991 | 1,210 |
| New generation records in the database | 1,991 | 1,210 |

The database recorded **exactly** the requests the app handled, with nothing lost
and nothing half-written. One side effect: at x1,000, **55 activities were left
behind**, matching the 55 delete requests that were refused after their create
succeeded. That is a client-side consequence of refused connections, not
corruption.

## What this means

- **Capacity on this machine: roughly 100 simultaneous users without errors**,
  although responses are already about 240 ms at that point, and well past it
  requests start being refused. A teacher-sized audience (a class or two) is
  within that.
- **Graceful rather than catastrophic failure:** the app refuses excess
  connections quickly, never crashes, keeps its data consistent and recovers when
  the surge ends.

## Caveats

- The load generator and the server shared one laptop, so they competed for CPU
  (at the heavier levels the whole machine peaked at 53% to 75%, so JMeter was
  not the limit, but it is not a clean separation).
- "x10,000 users" does not mean 10,000 simultaneous users: JMeter ramped them up
  over 60 seconds, and because refused users finish instantly, concurrency peaked
  at about 920.
- The think time is a simplification: real users pause for varying lengths.
- One server instance and one SQLite file were tested.

## What I would do next to go further

None of these was implemented; they are the options the results point to.

1. **Run several copies of the app behind a load balancer.** The limit is one
   core, so more processes (for example Docker replicas) raise it directly.
2. **Cache the dashboard figures for a few seconds.** `/api/stats` is the most
   expensive request (about 14 ms against 5 ms for the others) and its numbers do
   not need to be real-time.
3. **Move from SQLite to a client/server database** once more than one app
   instance needs to write at the same time.

## Reproducing

```bash
powershell -ExecutionPolicy Bypass -File jmeter\run-load-test.ps1
node jmeter/summarize-results.mjs
```

The first command needs Apache JMeter 5.6.3 (path set by `-JMeterHome`). It builds a throwaway
database for each level, so it never touches the development data.
