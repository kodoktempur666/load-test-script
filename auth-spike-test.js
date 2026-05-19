import http from "k6/http";
import { check, sleep  } from "k6";

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
    http_req_duration: ["p(50)<1000", "p(75)<1000", "p(90)<1000"],
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