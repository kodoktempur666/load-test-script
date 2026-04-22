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
    cart_activity: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 1200,

      stages: [
        { target: 50, duration: "30s" },
        { target: 70, duration: "30s" },
        { target: 100, duration: "30s" },
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

  const cartRes = http.post(`${BASE_URL}/api/carts`, null, {
    headers,
    tags: { name: "create_cart" },
  });

  if (!cartRes || cartRes.status !== 201) {
    console.error("Failed create cart", cartRes.status);
    return;
  }

  let cartId;
  try {
    cartId = cartRes.json("data.cartId");
  } catch (e) {
    console.error("JSON parse error", e);
    return;
  }

  const addItemRes = http.post(
    `${BASE_URL}/api/carts/${cartId}/items`,
    JSON.stringify({
      productId: 1,
      quantity: 1,
    }),
    { headers, tags: { name: "add_cart_item" } },
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
    { headers, tags: { name: "update_cart_item" } },
  );

  check(updateRes, {
    "item updated": (r) => r.status === 200,
  });

  const getCartRes = http.get(`${BASE_URL}/api/carts/${cartId}`, {
    headers,
    tags: { name: "get_cart" },
  });

  check(getCartRes, {
    "cart fetched": (r) => r.status === 200,
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
