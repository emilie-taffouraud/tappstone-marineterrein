export async function fetchJson(url, { timeoutMs = 8000, headers = {}, method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}) for ${url}: ${text.slice(0, 240)}`);
  }

  return response.json();
}

export async function fetchText(url, { timeoutMs = 8000, headers = {}, method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}) for ${url}: ${text.slice(0, 240)}`);
  }

  return response.text();
}
