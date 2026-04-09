import http from "k6/http";
import { check } from "k6";
import {
  randomString,
  randomIntBetween,
} from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

// ambil dari env (dengan default)
const HOST = __ENV.HOST || "18.139.14.134";
const PORT = __ENV.PORT || "3010";
const METHOD = (__ENV.METHOD || "POST").toUpperCase();

const BASE_URL = `http://${HOST}:${PORT}/checkout`;

export const options = {
  scenarios: {
    checkout_load_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 },
        { duration: "10s", target: 200 },
        { duration: "5s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_duration: ["p(50)<1000", "p(75)<1000", "p(90)<1000"],
  },
};

function formatWIB(date) {
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function setup() {
  const start = new Date();
  console.log(`Test started (WIB): ${formatWIB(start)}`);
  return { start: start.toISOString() };
}

export default function () {
  const id = randomIntBetween(1, 10000);

  const payload = JSON.stringify({
    name: randomString(10),
    amount: randomIntBetween(100, 10000),
    item: randomString(2),
  });

  const patchPayload = JSON.stringify({
    name: randomString(10),
  });

  let res;

  if (METHOD === "POST") {
    res = http.post(BASE_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    check(res, {
      "POST status is 202": (r) => r.status === 202,
    });
  } else if (METHOD === "GET") {
    res = http.get(`${BASE_URL}/${id}`);

    check(res, {
      "GET status is 200": (r) => r.status === 200,
    });
  } else if (METHOD === "PATCH") {
    res = http.patch(`${BASE_URL}/${id}`, patchPayload, {
      headers: { "Content-Type": "application/json" },
    });

    check(res, {
      "PATCH status is 200": (r) => r.status === 200,
    });
  } else if (METHOD === "PUT") {
    res = http.put(`${BASE_URL}/${id}`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    check(res, {
      "PUT status is 200": (r) => r.status === 200,
    });
  } else {
    console.error(`Method ${METHOD} tidak dikenali`);
  }
}

export function teardown(data) {
  const end = new Date();
  const start = new Date(data.start);
  const duration = (end - start) / 1000;

  console.log(`Test finished (WIB): ${formatWIB(end)}`);
  console.log(`Total duration: ${duration} seconds`);
}