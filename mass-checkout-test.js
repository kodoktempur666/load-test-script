import http from "k6/http";
import { check } from "k6";

const HOST = __ENV.HOST || "18.143.125.237";
const PORT = __ENV.PORT || "3000";
const BASE_URL = `http://${HOST}:${PORT}`;



function formatWIB(date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
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
    JSON.stringify({}), 
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
      productId: 10,
      quantity: 1,
    }),
    {
      headers,
      tags: { name: "add_cart_item" }
    }
  );

  const checkoutRes = http.post(
    `${BASE_URL}/api/carts/${cartId}/checkout`,
    JSON.stringify({}), 
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