import http from "k6/http";
import { check } from "k6";

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
    checkout_spike: {
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

  const headers = {
    "Content-Type": "application/json",
  };

  const cartRes = http.post(
    `${BASE_URL}/api/carts`,
    null,
    {
      headers,
      tags: { name: "create_cart" }
    }
  );

  const cartId = cartRes.json("data.cartId");
  if (!cartId) return;

  http.post(
    `${BASE_URL}/api/carts/${cartId}/items`,
    JSON.stringify({
      productId: 1,
      quantity: 1,
    }),
    {
      headers,
      tags: { name: "add_cart_item" }
    }
  );

  const checkoutRes = http.post(
    `${BASE_URL}/api/carts/${cartId}/checkout`,
    null,
    {
      headers,
      tags: { name: "checkout" }
    }
  );

  check(checkoutRes, {
    "checkout accepted": (r) =>
      r.status === 202 || r.status === 200,
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