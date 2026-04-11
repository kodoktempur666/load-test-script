import http from "k6/http";
import { check, sleep } from "k6";
import {
  randomString,
  randomIntBetween,
} from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const HOST = __ENV.HOST || "18.139.14.134";
const PORT = __ENV.PORT || "3010";
const METHOD = (__ENV.METHOD || "POST").toUpperCase();

const BASE_URL = `http://${HOST}:${PORT}/checkout`;

export const options = {
  scenarios: {
    high_concurrency_test: {
      executor: "constant-arrival-rate",

      rate: 500, // 🔥 500 request per second
      timeUnit: "1s",
      duration: "60s",

      preAllocatedVUs: 200, // worker awal
      maxVUs: 1000, // scaling maksimal
    },
  },

  thresholds: {
    http_req_duration: ["p(90)<2000"],
    http_req_failed: ["rate<0.05"], // max 5% error
  },
};

export default function () {
  const id = randomIntBetween(1, 10000);

  const payload = JSON.stringify({
    name: randomString(10),
    amount: randomIntBetween(100, 10000),
    item: randomString(5),
  });

  let res;

  if (METHOD === "POST") {
    res = http.post(BASE_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    check(res, {
      "POST status 202": (r) => r.status === 202,
    });
  }

  if (METHOD === "GET") {
    res = http.get(`${BASE_URL}/${id}`);

    check(res, {
      "GET status 200": (r) => r.status === 200,
    });
  }

  sleep(0.1); // kecilin biar lebih realistis
}