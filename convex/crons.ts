import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Two-phone sessions a day without any action are deleted with everything in them.
crons.interval(
  "delete idle sessions",
  { hours: 1 },
  internal.sessions.sweep,
  {},
);

export default crons;
