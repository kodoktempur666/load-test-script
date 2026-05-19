import http from "k6/http";
import { check, sleep  } from "k6";

const HOST = __ENV.HOST || "18.143.125.237";
const PORT = __ENV.PORT || "3000";

const BASE_URL = `http://${HOST}:${PORT}`;

function formatWIB(date) {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);

  const year = wib.getUTCFullYear();
  const month = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wib.getUTCDate()).padStart(2, "0");

  const hours = String(wib.getUTCHours()).padStart(2, "0");
  const minutes = String(wib.getUTCMinutes()).padStart(2, "0");
  const seconds = String(wib.getUTCSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} WIB`;
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
    auth_spike: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 1200,

      stages: [
        { target: 20, duration: "30s" },
        { target: 40, duration: "30s" },
        { target: 80, duration: "30s" },
        { target: 0, duration: "30s" },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],

  },
};


function randomUser() {
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;

  return {
    email: `user${uniqueId}@test.com`,
    password: "123456",
    name: `User${uniqueId}`,
  };
}

export default function () {
  const user = randomUser();

  const registerRes = http.post(
    `${BASE_URL}/api/register`,
    JSON.stringify(user),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  check(registerRes, {
    "register success": (r) => r.status === 201 || r.status === 200 || r.status === 202,
  });

  sleep(2)

  const loginRes = http.post(
    `${BASE_URL}/api/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  check(loginRes, {
    "login success": (r) => r.status === 200 || r.status === 201 || r.status === 202,
  });

  sleep(0.5); 

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