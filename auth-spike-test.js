import http from "k6/http";
import { check, sleep  } from "k6";

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
    auth_spike: {
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
};


function randomUser() {
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
  // const uniqueId = `${__VU}-${__ITER}}`;

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