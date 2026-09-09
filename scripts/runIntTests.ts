const port = Deno.env.get("TEST_PORT") ?? "3031";
const host = `http://127.0.0.1:${port}`;
// Fail before starting tests if another server already owns the requested port.
const reservation = Deno.listen({ hostname: "127.0.0.1", port: Number(port) });
reservation.close();
const server = new Deno.Command(Deno.execPath(), {
  args: ["run", "-A", "app/index.ts", `--port=${port}`],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();
let exited = false;
const serverStatus = server.status.then((status) => {
  exited = true;
  return status;
});
let code = 1;
try {
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline && !exited) {
    try {
      const response = await fetch(`${host}/health`, {
        signal: AbortSignal.timeout(1000),
      });
      await response.body?.cancel();
      if (response.ok) {
        ready = true;
        break;
      }
    } catch { /* Retry until the server is ready. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready || exited) {
    throw new Error("Integration test server failed to start");
  }
  const tests = new Deno.Command(Deno.execPath(), {
    args: ["test", "-A", "--ignore=**/*.unit.test.*", "test/"],
    env: { TEST_HOST: host },
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  code = (await tests.status).code;
} finally {
  if (!exited) server.kill("SIGTERM");
  await serverStatus;
}
Deno.exit(code);
