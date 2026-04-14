import http from "k6/http";
import { check } from "k6";
import {
  randomString,
  randomIntBetween,
} from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const HOST = __ENV.HOST || "18.139.14.134";
const PORT = __ENV.PORT || "3010";

const BASE_URL = `http://${HOST}:${PORT}/checkout`;

export const options = {
  scenarios: {
    dynamic_rps_test: {
      executor: "ramping-arrival-rate",

      startRate: 50,
      timeUnit: "1s",

      preAllocatedVUs: 200,
      maxVUs: 2000,

      stages: [
        { target: 100, duration: "10s" },

        // 10–20s → Normal load
        { target: 300, duration: "10s" },

        // 20–35s → Spike (BullMQ mulai unggul)
        { target: 1200, duration: "15s" },

        // 35–45s → High spike
        { target: 1800, duration: "10s" },

        // 45–60s → Recovery
        { target: 200, duration: "15s" },
      ],
      // stages: [
      //   // Warmup
      //   { target: 100, duration: "30s" },

      //   // Normal load
      //   { target: 300, duration: "30s" },

      //   // Spike (disini BullMQ harusnya unggul)
      //   { target: 1500, duration: "20s" },

      //   // Extreme spike
      //   { target: 2500, duration: "20s" },

      //   // Turun (lihat recovery)
      //   { target: 200, duration: "30s" },

      //   // Stabil lagi
      //   { target: 300, duration: "30s" },
      // ],
    },
  },

  thresholds: {
    http_req_duration: ["p(50)<1000", "p(75)<1000", "p(90)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const payload = JSON.stringify({
    name: randomString(10),
    amount: randomIntBetween(100, 10000),
    item: randomString(5),
  });

  let res;

  res = http.post(BASE_URL, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "POST status 200": (r) =>
      r.status === 200 || r.status === 201 || r.status === 202,
  });
}
