// Converts a free-form address (e.g., "Rome, Italy") into [x, y] = [longitude, latitude].
// Uses OpenStreetMap Nominatim public endpoint. Subject to rate limits; consider adding your own proxy/cache.
export async function geocodeAddressToXY(
  address: string,
  opts?: { email?: string; timeoutMs?: number },
): Promise<[number, number] | null> {
  const trimmed = (address ?? "").trim();
  if (!trimmed) return null;

  const timeoutMs = opts?.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", trimmed);
    // jsonv2 đôi khi trả cấu trúc dễ xài hơn nhưng json cũng ok
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");
    if (opts?.email) {
      // theo Nominatim policy có thể truyền email để liên hệ khi cần
      url.searchParams.set("email", opts.email);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        // BẮT BUỘC: cung cấp User-Agent hợp lệ (tên app + contact).
        // Thay YOUR_APP_NAME và your-email@example.com bằng thông tin của bạn.
        "User-Agent": "phuquivo03.cb@gmail.com",
        Accept: "application/json",
        // tuỳ chọn: ngôn ngữ kết quả
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      // optional: console.warn(`geocode failed status=${response.status}`);
      return null;
    }

    const results = (await response.json()) as unknown;
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const top = results[0] as { lat?: string | number; lon?: string | number };
    if (top == null || top.lat == null || top.lon == null) return null;

    const lat = parseFloat(String(top.lat));
    const lon = parseFloat(String(top.lon));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    // normalize longitude vào [-180, 180)
    const normalizeLon = (lo: number) => {
      const wrapped = ((((lo + 180) % 360) + 360) % 360) - 180;
      // handle -0 -> 0
      return Object.is(wrapped, -0) ? 0 : wrapped;
    };
    // clamp latitude vào [-90, 90]
    const clampLat = (la: number) => Math.max(-90, Math.min(90, la));

    const lonNorm = normalizeLon(lon);
    const latClamped = clampLat(lat);

    // round để tránh quá nhiều chữ số thập phân (tuỳ bạn)
    const round = (v: number, p = 6) => Math.round(v * Math.pow(10, p)) / Math.pow(10, p);

    return [round(lonNorm), round(latClamped)];
  } catch (err) {
    // nếu bị abort thì có thể log: (err.name === 'AbortError')
    // console.warn('geocode error', err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Convenience variant that returns { x, y } for callers who prefer object shape
export async function geocodeAddressToObject(
  address: string,
): Promise<{ x: number; y: number } | null> {
  const xy = await geocodeAddressToXY(address);
  return xy ? { x: xy[0], y: xy[1] } : null;
}
