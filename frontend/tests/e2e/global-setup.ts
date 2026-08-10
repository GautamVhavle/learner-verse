const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default async function globalSetup() {
  const response = await fetch(`${API}/auth/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ onboarding_complete: true }),
  });
  if (!response.ok) {
    throw new Error(`E2E setup failed with HTTP ${response.status}: ${await response.text()}`);
  }
}
