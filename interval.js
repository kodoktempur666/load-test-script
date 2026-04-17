import fs from "fs";

const users = [];

for (let i = 1; i <= 300; i++) {
  users.push({
    email: `user${i}@test.com`,
    name: `User${i}`,
    password: "123456",
  });
}

fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

console.log("✅ users.json generated (300 users)");