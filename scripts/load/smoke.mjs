import autocannon from "autocannon";

const baseUrl = process.env.LOAD_BASE_URL ?? "http://localhost:4000";
const durationSeconds = Number(process.env.LOAD_DURATION_SECONDS ?? "20");
const connections = Number(process.env.LOAD_CONNECTIONS ?? "20");
const pipeline = Number(process.env.LOAD_PIPELINE ?? "1");
const overallRate = Number(process.env.LOAD_OVERALL_RATE ?? "4");

const instance = autocannon({
  url: `${baseUrl}/health/live`,
  connections,
  duration: durationSeconds,
  pipelining: pipeline,
  overallRate,
  method: "GET"
});

autocannon.track(instance, { renderProgressBar: true });

instance.on("done", (result) => {
  const errors = result.errors ?? 0;
  const timeouts = result.timeouts ?? 0;
  const total = result.requests?.total ?? 0;
  const p99 = result.latency?.p99 ?? 0;
  const success2xx = result["2xx"] ?? 0;
  const non2xx = result.non2xx ?? 0;
  const successRatio = total > 0 ? (success2xx / total) * 100 : 0;

  console.log("\nLoad test summary");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Duration: ${durationSeconds}s`);
  console.log(`Connections: ${connections}`);
  console.log(`Overall rate: ${overallRate} req/s`);
  console.log(`Requests total: ${total}`);
  console.log(`Latency p99: ${p99} ms`);
  console.log(`2xx responses: ${success2xx}`);
  console.log(`Non-2xx responses: ${non2xx}`);
  console.log(`Success ratio: ${successRatio.toFixed(2)}%`);
  console.log(`Errors: ${errors}`);
  console.log(`Timeouts: ${timeouts}`);

  if (errors > 0 || timeouts > 0 || successRatio < 95) {
    console.error("Load test failed: there were errors/timeouts.");
    process.exit(1);
  }

  console.log("Load test passed.");
});
