import http from "k6/http";
import { check, sleep  } from "k6";

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
    auth_spike: {
      executor: "ramping-arrival-rate",

      startRate: 50, 
      timeUnit: "1s",

      preAllocatedVUs: 200,
      maxVUs: 1000,

      stages: [
        { target: 100, duration: "15s" },
        { target: 200, duration: "15s" },
        { target: 500, duration: "15s" }, 
        { target: 0, duration: "15s" },
      ],
    },
  },
};


function randomUser() {
  // const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
  const uniqueId = `${__VU}-${__ITER}}`;

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
  const endTime = new Date().toISOString();
  console.log(`TEST END: ${endTime}`);

  if (data && data.startTime) {
    const duration =
      new Date(endTime).getTime() - new Date(data.startTime).getTime();

    console.log(`TOTAL DURATION: ${(duration / 1000).toFixed(2)} seconds`);
  }
}