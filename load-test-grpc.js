import http from "k6/http";
import { check } from "k6";
import { randomString, randomIntBetween, } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";


const BASE_URL = 'http://202.10.41.230:3000/checkout';

export const options = {
  scenarios: {
    checkout_load_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },

  thresholds: {
    http_req_duration: ["p(50)<1000", "p(75)<1000", "p(90)<1000"],
    http_req_failed: [],
  },
};

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

  // POST
  const res = http.post(BASE_URL, payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  check(res, {
    "POST status is 200": (r) => r.status === 200,
  });

  // GET
  const getRes = http.get(`${BASE_URL}/${id}`);

  check(getRes, {
    "GET status is 200": (r) => r.status === 200,
  });

  // PATCH
  const editRes = http.patch(`${BASE_URL}/${id}`, patchPayload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  check(editRes, {
    "PATCH status is 200": (r) => r.status === 200,
  });

  // PUT
  const putRes = http.put(`${BASE_URL}/${id}`, payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  check(putRes, {
    "PUT status is 200": (r) => r.status === 200,
  });
}

