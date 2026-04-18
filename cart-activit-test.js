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
      startRate: 50,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { target: 100, duration: "10s" },
        { target: 300, duration: "10s" },
        { target: 700, duration: "15s" },
        { target: 1000, duration: "15s" },
        { target: 0, duration: "10s" },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

function userData() {
  const id = randomIntBetween(1, 300);
  return {
    email: `user${id}@test.com`,
    password: "123456",
  };
}


export default function () {
  const user = userData();

  const loginRes = http.post(
    `${BASE_URL}/api/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(loginRes, {
    "login success": (r) => r.status === 200,
  });

  const token = loginRes.json("data.token");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const cartRes = http.post(`${BASE_URL}/api/carts`, null, {
    headers: authHeaders,
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
    { headers: authHeaders }
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
    { headers: authHeaders }
  );

  check(updateRes, {
    "item updated": (r) => r.status === 200,
  });

  const getCartRes = http.get(`${BASE_URL}/api/carts/${cartId}`, {
    headers: authHeaders,
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