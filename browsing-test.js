import http from "k6/http";
import { check } from "k6";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const HOST = __ENV.HOST || "18.143.125.237";
const PORT = __ENV.PORT || "3000";
const BASE_URL = `http://${HOST}:${PORT}`;


export function setup() {
  const now = new Date();

  const startTimeISO = now.toISOString();
  const startTimeUnix = Math.floor(now.getTime() / 1000);

  console.log(`TEST START (ISO): ${startTimeISO}`);
  console.log(`TEST START (UNIX): ${startTimeUnix}`);

  return { startTimeISO, startTimeUnix };
}

export const options = {
  scenarios: {
    browsing_load: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 1200,

      stages: [
        { target: 100, duration: "30s" },
        { target: 300, duration: "30s" },
        { target: 600, duration: "30s" },
        { target: 0, duration: "30s" },
      ],
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(50)<1000", "p(75)<1000", "p(90)<1000"],
  },
};

export default function () {

  const productsRes = http.get(`${BASE_URL}/api/products`);

  check(productsRes, {
    "products fetched": (r) => r.status === 200,
  });


  const productId = randomIntBetween(1, 100); 

  const productRes = http.get(`${BASE_URL}/api/products/${productId}`);

  check(productRes, {
    "product detail fetched": (r) =>
      r.status === 200 || r.status === 404, 
  });

  const categoriesRes = http.get(`${BASE_URL}/api/categories`);

  check(categoriesRes, {
    "categories fetched": (r) => r.status === 200,
  });
}

export function teardown(data) {
  const now = new Date();

  const endTimeISO = now.toISOString();
  const endTimeUnix = Math.floor(now.getTime() / 1000);

  console.log(`TEST END (ISO): ${endTimeISO}`);
  console.log(`TEST END (UNIX): ${endTimeUnix}`);

  if (data && data.startTimeISO) {
    const duration =
      new Date(endTimeISO).getTime() - new Date(data.startTimeISO).getTime();

    console.log(`TOTAL DURATION: ${(duration / 1000).toFixed(2)} seconds`);
  }

  if (data && data.startTimeUnix) {
    const durationUnix = endTimeUnix - data.startTimeUnix;
    console.log(`TOTAL DURATION (UNIX): ${durationUnix} seconds`);
  }
}