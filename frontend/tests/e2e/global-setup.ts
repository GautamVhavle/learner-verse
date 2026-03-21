const API = "http://localhost:8000/api/v1";

export default async function globalSetup() {
  await fetch(`${API}/auth/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ onboarding_complete: true }),
  });
}
