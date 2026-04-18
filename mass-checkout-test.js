import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const users = new SharedArray("users", function () {
  return JSON.parse(open("./users.json"));
});

const HOST = __ENV.HOST || "18.139.14.134";
const PORT = __ENV.PORT || "3000";
const BASE_URL = `http://${HOST}:${PORT}`;

export const options = {
  scenarios: {
    checkout_load: {
      executor: "ramping-arrival-rate",
      startRate: 50,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 1000,
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
    } catch (e) {}
  }

  if (!token) return;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  sleep(0.5); // 🔥 simulasi user pause

  // ================= CREATE CART =================
  const cartRes = http.post(`${BASE_URL}/api/carts`, null, { headers });

  const cartOk = check(cartRes, {
    "cart created": (r) => r && r.status === 201,
  });

  let cartId = null;
  if (cartOk && cartRes.body) {
    try {
      cartId = cartRes.json("data.cartId");
    } catch (e) {}
  }

  if (!cartId) return;

  // ================= WAIT CART READY (IMPORTANT) =================
  let cartReady = false;

  for (let i = 0; i < 5; i++) {
    const checkCart = http.get(`${BASE_URL}/api/carts/${cartId}`, { headers });

    if (checkCart.status === 200) {
      cartReady = true;
      break;
    }

    sleep(0.5); // tunggu worker
  }

  if (!cartReady) {
    console.warn(`Cart not ready: ${cartId}`);
    return;
  }

  sleep(0.5); // delay user

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

  if (!addItemOk) return;

  sleep(0.5);

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
    } catch (e) {}
  }

  if (!orderId) return;

  sleep(0.5);

  // ================= GET ORDER =================
  for (let i = 0; i < 3; i++) {
    const orderRes = http.get(
      `${BASE_URL}/api/orders/${orderId}`,
      { headers }
    );

    check(orderRes, {
      "order fetched": (r) => r && r.status === 200,
    });

    sleep(0.3); // delay antar polling
  }
}