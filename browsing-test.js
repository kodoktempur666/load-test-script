import http from "k6/http";
import { check } from "k6";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const HOST = __ENV.HOST || "18.139.14.134";
const PORT = __ENV.PORT || "3000";
const BASE_URL = `http://${HOST}:${PORT}`;


export function setup() {
  const startTime = new Date().toISOString();
  console.log(`TEST START: ${startTime}`);
  return { startTime };
}


export const options = {
  scenarios: {
    browsing_load: {
      executor: "ramping-arrival-rate",

      startRate: 100,
      timeUnit: "1s",

      preAllocatedVUs: 300,
      maxVUs: 2000,

      stages: [
        { target: 300, duration: "10s" },   
        { target: 800, duration: "15s" },  
        { target: 1500, duration: "20s" },  
        { target: 2500, duration: "20s" }, 
        { target: 0, duration: "10s" },     
      ],
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"], 
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
  const endTime = new Date().toISOString();
  console.log(`TEST END: ${endTime}`);

  if (data && data.startTime) {
    const duration =
      new Date(endTime).getTime() - new Date(data.startTime).getTime();

    console.log(`TOTAL DURATION: ${(duration / 1000).toFixed(2)} seconds`);
  }
}