// Gives someone the teacher (or admin) role, or takes it away.
//
//   npm run role:set -- anna@iskola.hu teacher    make Anna a teacher
//   npm run role:set -- anna@iskola.hu student    back to student
//   npm run role:set -- anna@iskola.hu            show her current role
//
// The person must have signed in to eNvolve at least once. Needs
// CLERK_SECRET_KEY in .env.local (the same key the app uses). The role is
// stored in Clerk publicMetadata, which only this secret key can change, and
// reaches the app through the session token's "app_role" claim within about
// a minute (or right away after signing out and in again).
const ROLES = ["teacher", "admin", "student"];

for (const file of [".env.local", ".env"]) {
  if (process.env.CLERK_SECRET_KEY) break;
  try {
    process.loadEnvFile(new URL(`../${file}`, import.meta.url));
  } catch {
    // file missing: fine
  }
}

const [email, role] = process.argv.slice(2);
const key = process.env.CLERK_SECRET_KEY;
const api = "https://api.clerk.com/v1";

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!key) fail("CLERK_SECRET_KEY is missing. Add it to .env.local and run again.");
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("Usage: npm run role:set -- <e-mail> [teacher|admin|student]");
}
if (role && !ROLES.includes(role)) fail(`Unknown role "${role}". Use one of: ${ROLES.join(", ")}.`);

const call = async (path, init = {}) => {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const body = await response.text();
    fail(`Clerk answered ${response.status}${response.status === 401 ? " (check CLERK_SECRET_KEY)" : ""}: ${body.slice(0, 300)}`);
  }
  return response.json();
};

const users = await call(`/users?email_address=${encodeURIComponent(email)}&limit=2`);
if (users.length === 0) fail(`No eNvolve account with ${email}. They need to sign in once first.`);
const user = users[0];
const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || email;
const current = user.public_metadata?.role ?? "student";

if (!role) {
  console.log(`${name} <${email}>: ${current}`);
  process.exit(0);
}

// Merges into publicMetadata; null removes the key (= student)
await call(`/users/${user.id}/metadata`, {
  method: "PATCH",
  body: JSON.stringify({ public_metadata: { role: role === "student" ? null : role } }),
});

console.log(`${name} <${email}>: ${current} → ${role}`);
console.log("Takes effect within a minute, or right away after signing out and in again.");
