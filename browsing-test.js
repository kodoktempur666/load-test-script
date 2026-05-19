import http from "k6/http";
import { check } from "k6";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const HOST = __ENV.HOST || "18.143.125.237";
const PORT = __ENV.PORT || "3000";
const BASE_URL = `http://${HOST}:${PORT}`;

function formatWIB(date) {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);

  const year = wib.getUTCFullYear();
  const month = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wib.getUTCDate()).padStart(2, "0");

  const hours = String(wib.getUTCHours()).padStart(2, "0");
  const minutes = String(wib.getUTCMinutes()).padStart(2, "0");
  const seconds = String(wib.getUTCSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} WIB`;
}

export function setup() {
  const now = new Date();

  const startTimeWIB = formatWIB(now);
  const startTimeUnix = Math.floor(now.getTime() / 1000);

  console.log(`TEST START (WIB): ${startTimeWIB}`);
  console.log(`TEST START (UNIX): ${startTimeUnix}`);

  return { startTimeWIB, startTimeUnix };
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

  },
};

export default function () {
  const productsRes = http.get(`${BASE_URL}/api/products`);

  check(productsRes, {
    "products fetched": (r) => r.status === 200,
  });

  const productId = randomIntBetween(1, 50);

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

  const endTimeWIB = formatWIB(now);
  const endTimeUnix = Math.floor(now.getTime() / 1000);

  console.log(`TEST END (WIB): ${endTimeWIB}`);
  console.log(`TEST END (UNIX): ${endTimeUnix}`);

  if (data && data.startTimeUnix) {
    const durationUnix = endTimeUnix - data.startTimeUnix;

    console.log(`TOTAL DURATION: ${durationUnix} seconds`);
  }
}