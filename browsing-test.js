import http from "k6/http";
import { check } from "k6";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const HOST = __ENV.HOST || "18.139.14.134";
const PORT = __ENV.PORT || "3000";
const BASE_URL = `http://${HOST}:${PORT}`;

export const options = {
  scenarios: {
    browsing_load: {
      executor: "ramping-arrival-rate",

      startRate: 100,
      timeUnit: "1s",

      preAllocatedVUs: 300,
      maxVUs: 2000,

      stages: [
        { target: 300, duration: "10s" },   // warmup
        { target: 800, duration: "15s" },   // normal browsing
        { target: 1500, duration: "20s" },  // high traffic
        { target: 2500, duration: "20s" },  // peak (homepage hit)
        { target: 0, duration: "10s" },     // cooldown
      ],
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"], // harus cepat (read-only)
  },
};

export default function () {
  // 🔥 1. GET PRODUCTS (list)
  const productsRes = http.get(`${BASE_URL}/api/products`);

  check(productsRes, {
    "products fetched": (r) => r.status === 200,
  });

  // 🔥 2. RANDOM PRODUCT DETAIL
  const productId = randomIntBetween(1, 100); // sesuaikan range DB

  const productRes = http.get(`${BASE_URL}/api/products/${productId}`);

  check(productRes, {
    "product detail fetched": (r) =>
      r.status === 200 || r.status === 404, // 404 masih valid
  });

  // 🔥 3. GET CATEGORIES
  const categoriesRes = http.get(`${BASE_URL}/api/categories`);

  check(categoriesRes, {
    "categories fetched": (r) => r.status === 200,
  });
}