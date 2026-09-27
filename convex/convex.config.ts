import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    /**
     * The publisher's key to /admin. Set it with
     * `npx convex env set ADMIN_TOKEN "$(openssl rand -base64 32)"`; while it is
     * unset (or short), every admin function refuses (convex/admin.ts).
     */
    ADMIN_TOKEN: v.optional(v.string()),
  },
});

export default app;
