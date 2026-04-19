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
    cart_activity: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { target: 10, duration: "10s" },   
        { target: 30, duration: "10s" },  
        { target: 70, duration: "15s" },   
        { target: 100, duration: "15s" },  
        { target: 0, duration: "10s" },  
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};



export default function () {
  
  const headers = {
    "Content-Type": "application/json",
  };

  const cartRes = http.post(`${BASE_URL}/api/carts`, null, {
    headers,
    tags: { name: "create_cart" },
  });

  check(cartRes, {
    "cart created": (r) => r.status === 201,
  });

  const cartId = cartRes.json("data.cartId");

  const addItemRes = http.post(
    `${BASE_URL}/api/carts/${cartId}/items`,
    JSON.stringify({
      productId: 1,
      quantity: 1,
    }),
    { headers, tags: { name: "add_cart_item" } }

  );

  check(addItemRes, {
    "item added": (r) => r.status === 200 || r.status === 202,
  });

  const itemId = 1;

  const updateRes = http.patch(
    `${BASE_URL}/api/carts/${cartId}/items/${itemId}`,
    JSON.stringify({
      quantity: 2,
    }),
    { headers, tags: { name: "update_cart_item" } }
  );

  check(updateRes, {
    "item updated": (r) => r.status === 200,
  });

  const getCartRes = http.get(`${BASE_URL}/api/carts/${cartId}`, {
    headers, tags: { name: "get_cart" }
  });

  check(getCartRes, {
    "cart fetched": (r) => r.status === 200,
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