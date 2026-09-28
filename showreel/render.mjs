// Renders index.html to showreel.mp4: headless Chrome frames over raw CDP, temporal supersampling for real motion blur, the synthesized score muxed in.
//   node showreel/render.mjs                    full quality (60 fps, 8 subframes)
//   node showreel/render.mjs --sub 1 --fps 30   quick draft
//   node showreel/render.mjs --stills 4,9.5,13  PNG stills only, into showreel/stills/
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  createReadStream,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { DURATION, FPS } from "./timeline.mjs";

const here = import.meta.dirname;
const root = resolve(here, "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? fallback : args[i + 1];
};
const stills = opt("stills")?.split(",").map(Number);
const fps = Number(opt("fps", FPS));
const sub = Number(opt("sub", 8));
// ponytail: Chromes share one GPU; past 2 workers they contend and total throughput drops (6 ran 15× slower than 1).
const workers = Number(opt("workers", 2));
const out = resolve(opt("out", join(here, "showreel.mp4")));
const SHUTTER = 0.5; // 180°, the film look.
const CHROME =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Static server rooted at the repo, so the page can load /public/images and the ES modules.
const TYPES = {
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};
const server = createServer((req, res) => {
  const path = join(
    root,
    decodeURIComponent(new URL(req.url, "http://x").pathname),
  );
  const file =
    path.startsWith(root + sep) &&
    statSync(path, { throwIfNoEntry: false })?.isFile();
  if (!file) return res.writeHead(404).end();
  res.writeHead(200, {
    "content-type": TYPES[extname(path)] ?? "application/octet-stream",
  });
  createReadStream(path).pipe(res);
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const url = `http://127.0.0.1:${server.address().port}/showreel/index.html`;

// One Chrome per worker: background tabs in a shared headless browser never paint, so their screenshots hang.
const browsers = [];
async function openPage() {
  const profile = mkdtempSync(join(tmpdir(), "reel-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--hide-scrollbars",
      "--mute-audio",
      "--no-first-run",
      "--force-color-profile=srgb",
      "--window-size=1920,1080",
      url,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const browser = { chrome, profile };
  browsers.push(browser);
  const wsUrl = await new Promise((ok, fail) => {
    let log = "";
    chrome.stderr.on("data", (d) => {
      log += d;
      const m = log.match(/DevTools listening on (ws:\S+)/);
      if (m) ok(m[1]);
    });
    chrome.once("exit", () => fail(new Error(`Chrome exited:\n${log}`)));
  });
  const ws = new WebSocket(wsUrl);
  browser.ws = ws;
  await once(ws, "open");
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.method === "Runtime.exceptionThrown")
      console.error(
        "page error:",
        msg.params.exceptionDetails.exception?.description,
      );
    const call = pending.get(msg.id);
    if (!call) return;
    pending.delete(msg.id);
    if (msg.error) call.fail(new Error(`${call.method}: ${msg.error.message}`));
    else call.ok(msg.result);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((ok, fail) => {
      const id = ++nextId;
      pending.set(id, { ok, fail, method });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const { targetInfos } = await send("Target.getTargets");
  const page = targetInfos.find((target) => target.type === "page");
  const { sessionId } = await send("Target.attachToTarget", {
    targetId: page.targetId,
    flatten: true,
  });
  const call = (method, params) => send(method, params, sessionId);
  await call("Runtime.enable");
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call("Page.reload");
  const evaluate = async (expression) => {
    const r = await call("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description ?? expression);
    return r.result.value;
  };
  while (
    !(await evaluate(
      "window.ready ? window.ready.then(() => true) : false",
    ).catch(() => false))
  ) {
    await new Promise((ok) => setTimeout(ok, 100));
  }
  return async (t, format = "jpeg") => {
    await evaluate(`render(${t})`);
    const { data } = await call("Page.captureScreenshot", {
      format,
      quality: format === "jpeg" ? 95 : undefined,
    });
    return Buffer.from(data, "base64");
  };
}

try {
  if (stills) {
    const shoot = await openPage();
    mkdirSync(join(here, "stills"), { recursive: true });
    for (const t of stills) {
      writeFileSync(
        join(here, "stills", `${t.toFixed(2)}.png`),
        await shoot(t, "png"),
      );
      console.log(`still ${t}s`);
    }
  } else {
    const wav = join(tmpdir(), `reel-score-${process.pid}.wav`);
    const { writeScore } = await import("./score.mjs");
    writeScore(wav);
    const frames = Math.round(DURATION * fps);
    const total = frames * sub;
    // Subframes spread across the open shutter, centred on each frame's time.
    const time = (n) =>
      Math.max(
        0,
        (Math.floor(n / sub) +
          (SHUTTER * ((n % sub) + 0.5)) / sub -
          SHUTTER / 2) /
          fps,
      );
    const blur =
      sub > 1 ? `tmix=frames=${sub},select='not(mod(n+1\\,${sub}))',` : "";
    const enc = spawn(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "image2pipe",
        "-framerate",
        String(fps * sub),
        "-c:v",
        "mjpeg",
        "-i",
        "-",
        "-i",
        wav,
        "-vf",
        `${blur}setpts=N/(${fps}*TB)`,
        "-r",
        String(fps),
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "256k",
        "-shortest",
        "-movflags",
        "+faststart",
        "-f",
        "mp4",
        `${out}.part`,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    // Workers finish out of order; frames go to ffmpeg strictly in order.
    const done = new Map();
    let written = 0;
    let claimed = 0;
    let writing = Promise.resolve();
    const flush = () => {
      writing = writing.then(async () => {
        while (done.has(written)) {
          const buf = done.get(written);
          done.delete(written);
          written++;
          if (!enc.stdin.write(buf)) await once(enc.stdin, "drain");
          if (written % (sub * fps) === 0)
            console.log(`${(written / sub / fps).toFixed(0)}s / ${DURATION}s`);
        }
      });
      return writing;
    };
    const started = Date.now();
    await Promise.all(
      Array.from({ length: workers }, async () => {
        const shoot = await openPage();
        while (claimed < total) {
          const n = claimed++;
          done.set(n, await shoot(time(n)));
          await flush();
        }
      }),
    );
    enc.stdin.end();
    const [code] = await once(enc, "exit");
    if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
    // Only a finished render replaces the last good video.
    renameSync(`${out}.part`, out);
    console.log(
      `wrote ${out} in ${((Date.now() - started) / 1000).toFixed(0)}s`,
    );
  }
} finally {
  for (const { chrome, profile, ws } of browsers) {
    ws?.close();
    if (chrome.exitCode === null) {
      chrome.kill("SIGKILL");
      await once(chrome, "exit");
    }
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
  server.closeAllConnections();
  server.close();
}
