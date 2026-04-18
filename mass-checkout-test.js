import http from "k6/http";
import { check } from "k6";
import { SharedArray } from "k6/data";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const users = new SharedArray("users", function () {
  return JSON.parse(open("./users.json"));
});

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
    checkout_load: {
      executor: "ramping-arrival-rate",

      startRate: 5, // 🔽 mulai dari 20 req/s
      timeUnit: "1s",

      preAllocatedVUs: 200,
      maxVUs: 300, // 🔽 turunin dikit biar lebih stabil

      stages: [
        { target: 10, duration: "10s" },
        { target: 50, duration: "10s" },
        { target: 100, duration: "15s" },
        { target: 0, duration: "10s" },
      ],
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const user = users[__VU % users.length];

  // ================= LOGIN =================
  const loginRes = http.post(
    `${BASE_URL}/api/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  const loginOk = check(loginRes, {
    "login success": (r) => r && r.status === 200,
  });

  let token = null;
  if (loginOk && loginRes.body) {
    try {
      token = loginRes.json("data.token");
    } catch (e) {
      console.error("Login JSON parse error");
    }
  }

  if (!token) {
    console.warn(`Login failed: ${loginRes.status}`);
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ================= CREATE CART =================
  const cartRes = http.post(`${BASE_URL}/api/carts`, null, { headers });

  const cartOk = check(cartRes, {
    "cart created": (r) => r && r.status === 201,
  });

  let cartId = null;
  if (cartOk && cartRes.body) {
    try {
      cartId = cartRes.json("data.cartId");
    } catch (e) {
      console.error("Cart JSON parse error");
    }
  }

  if (!cartId) {
    console.warn(`Cart failed: ${cartRes.status}`);
    return;
  }

  // ================= ADD ITEM =================
  const addItemRes = http.post(
    `${BASE_URL}/api/carts/${cartId}/items`,
    JSON.stringify({
      productId: randomIntBetween(11, 50),
      quantity: randomIntBetween(1, 5),
    }),
    { headers }
  );

  const addItemOk = check(addItemRes, {
    "item added": (r) => r && (r.status === 200 || r.status === 202),
  });

  if (!addItemOk) {
    console.warn(`Add item failed: ${addItemRes.status}`);
    return;
  }

  // ================= CHECKOUT =================
  const checkoutRes = http.post(
    `${BASE_URL}/api/carts/${cartId}/checkout`,
    null,
    { headers }
  );

  const checkoutOk = check(checkoutRes, {
    "checkout accepted": (r) => r && (r.status === 200 || r.status === 202),
  });

  let orderId = null;
  if (checkoutOk && checkoutRes.body) {
    try {
      orderId = checkoutRes.json("data.orderId");
    } catch (e) {
      console.error("Checkout JSON parse error");
    }
  }

  if (!orderId) {
    console.warn(`Checkout failed: ${checkoutRes.status}`);
    return;
  }

  // ================= GET ORDER =================
  for (let i = 0; i < 3; i++) {
    const orderRes = http.get(
      `${BASE_URL}/api/orders/${orderId}`,
      { headers }
    );

    check(orderRes, {
      "order fetched": (r) => r && r.status === 200,
    });
  }
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