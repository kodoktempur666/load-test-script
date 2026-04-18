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

export const options = {
  scenarios: {
    checkout_load: {
      executor: "ramping-arrival-rate",

      startRate: 50,
      timeUnit: "1s",

      preAllocatedVUs: 200,
      maxVUs: 1500,

      stages: [
        { target: 100, duration: "10s" },   
        { target: 300, duration: "10s" },  
        { target: 700, duration: "15s" },   
        { target: 1200, duration: "15s" },  
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
  if (!token) return;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const cartRes = http.post(`${BASE_URL}/api/carts`, null, { headers });

  check(cartRes, {
    "cart created": (r) => r.status === 201,
  });

  const cartId = cartRes.json("data.cartId");
  if (!cartId) return;

  const addItemRes = http.post(
    `${BASE_URL}/api/carts/${cartId}/items`,
    JSON.stringify({
      productId: randomIntBetween(11, 50),
      quantity: randomIntBetween(1, 5),
    }),
    { headers }
  );

  check(addItemRes, {
    "item added": (r) => r.status === 200 || r.status === 202,
  });

  const checkoutRes = http.post(
    `${BASE_URL}/api/carts/${cartId}/checkout`,
    null,
    { headers }
  );

  check(checkoutRes, {
    "checkout accepted": (r) => r.status === 200 || r.status === 202,
  });

  const orderId = checkoutRes.json("data.orderId");

  if (!orderId) return;

  for (let i = 0; i < 3; i++) {
    const orderRes = http.get(
      `${BASE_URL}/api/orders/${orderId}`,
      { headers }
    );

    check(orderRes, {
      "order fetched": (r) => r.status === 200,
    });
  }
}