import http from "k6/http";
import { check } from "k6";
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
    dynamic_rps_test: {
      executor: "ramping-arrival-rate",

      startRate: 100, 
      timeUnit: "1s",

      preAllocatedVUs: 200,
      maxVUs: 2000,

      stages: [
        { target: 1000, duration: "20s" }, 
        { target: 2000, duration: "20s" }, 
        { target: 0, duration: "10s" }, 
      ],
    },
  },

  thresholds: {
    http_req_duration: ["p(50)<1000", "p(75)<1000", "p(90)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const id = randomIntBetween(1, 10000);

  const payload = JSON.stringify({
    name: randomString(10),
    amount: randomIntBetween(100, 10000),
    item: randomString(5),
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
      "POST status 200": (r) => r.status === 200 || r.status === 201 || r.status === 202,
    });
  } else if (METHOD === "GET") {
    res = http.get(`${BASE_URL}/${id}`);

    check(res, {
      "GET status valid": (r) => r.status === 200 || r.status === 202,
    });
  } else if (METHOD === "PATCH") {
    res = http.patch(`${BASE_URL}/${id}`, patchPayload, {
      headers: { "Content-Type": "application/json" },
    });

    check(res, {
      "PATCH status valid": (r) => r.status === 200 || r.status === 202,
    });
  } else if (METHOD === "PUT") {
    res = http.put(`${BASE_URL}/${id}`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    check(res, {
      "PUT status valid": (r) => r.status === 200 || r.status === 202,
    });
  }
}