// api/ipinfo.js
const COUNTRY_REGION_DATA_URL = "https://unpkg.com/country-region-data@3.1.0/data.json";

let _countryRegionData = null;
let _countryRegionDataPromise = null;

async function loadCountryRegionData() {
  if (_countryRegionData) return _countryRegionData;
  if (_countryRegionDataPromise) return _countryRegionDataPromise;

  _countryRegionDataPromise = fetch(COUNTRY_REGION_DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load country-region-data (${r.status})`);
      return r.json();
    })
    .then((json) => {
      _countryRegionData = json;
      return _countryRegionData;
    })
    .catch((err) => {
      // allow retry next time
      _countryRegionDataPromise = null;
      throw err;
    });

  return _countryRegionDataPromise;
}

function pickRemoteIp(headerIp, socketRemote) {
  // x-forwarded-for may be a comma list; pick first
  if (headerIp) {
    return String(headerIp).split(",")[0].trim();
  }
  return socketRemote || "Unknown";
}

export default async function handler(request, response) {
  try {
    const apiKey = request.query?.key;
    const validApiKey = process.env.API_KEY;

    if (!apiKey || apiKey !== validApiKey) {
      return response.status(401).json({ error: "Invalid or missing API key" });
    }

    // IP and basic headers (Vercel uses x-vercel-* headers)
    const ip = pickRemoteIp(request.headers["x-forwarded-for"] || request.headers["x-vercel-forwarded-for"], request.socket?.remoteAddress || request.connection?.remoteAddress);
    const city = request.headers["x-vercel-ip-city"] || request.headers["x-city"] || "Unknown";

    // country code header (e.g. "IN")
    const countryCodeRaw = (request.headers["x-vercel-ip-country"] || request.headers["x-country"] || "Unknown").toString().toUpperCase();

    // region header might be "KL" or "IN-KL" depending on provider
    const regionRaw = (request.headers["x-vercel-ip-country-region"] || request.headers["x-region"] || "Unknown").toString();

    // default fallbacks
    let countryName = countryCodeRaw;
    let regionName = regionRaw;

    try {
      const data = await loadCountryRegionData(); // array of countries
      if (data && Array.isArray(data) && countryCodeRaw && countryCodeRaw !== "UNKNOWN") {
        const countryObj = data.find(
          (c) => (c.countryShortCode || "").toString().toUpperCase() === countryCodeRaw
        );

        if (countryObj) {
          countryName = countryObj.countryName || countryCodeRaw;

          // normalize region part: if header is "IN-KL" split and take second part
          let regionPart = regionRaw;
          if (typeof regionPart === "string" && regionPart.includes("-")) {
            const parts = regionPart.split("-");
            regionPart = parts.length >= 2 ? parts[1] : parts[0];
          }

          if (regionPart && regionPart !== "Unknown") {
            // Try to match by shortCode or by exact name (case-insensitive)
            const found = (countryObj.regions || []).find((r) => {
              const sc = (r.shortCode || "").toString().toUpperCase();
              const rn = (r.name || "").toString().toUpperCase();
              return sc === regionPart.toString().toUpperCase() || rn === regionPart.toString().toUpperCase();
            });

            if (found) {
              regionName = found.name;
            } else {
              // Some datasets store region shortCodes without the country prefix,
              // or use different patterns — try matching by suffix:
              const suffixMatch = (countryObj.regions || []).find((r) => {
                const sc = (r.shortCode || "").toString();
                return sc.split("-").pop().toUpperCase() === regionPart.toString().toUpperCase();
              });
              if (suffixMatch) regionName = suffixMatch.name;
              else regionName = regionPart; // best-effort: return what we have
            }
          } else {
            // region header empty/unknown — leave as-is
            regionName = regionRaw;
          }
        } else {
          // country code not found in dataset -> keep code as name fallback
          countryName = countryCodeRaw;
          regionName = regionRaw;
        }
      }
    } catch (err) {
      // If the external JSON failed to load, return short codes (safe fallback)
      console.error("country-region-data load error:", err?.message || err);
      countryName = countryCodeRaw;
      regionName = regionRaw;
    }

    return response.status(200).json({
      ip: ip,
      city: city,
      country_code: countryCodeRaw,
      country_name: countryName,
      region_code: regionRaw,
      region: regionName,
    });
  } catch (err) {
    console.error("handler unexpected error:", err);
    return response.status(500).json({ error: "Internal Server Error" });
  }
}
