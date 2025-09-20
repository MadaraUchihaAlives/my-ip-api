import iso3166 from "iso-3166-2";
import countries from "i18n-iso-countries";

countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

export default function handler(request, response) {
  const apiKey = request.query.key;
  const validApiKey = process.env.API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return response.status(401).json({ error: "Invalid or missing API key" });
  }

  const ip = request.headers["x-forwarded-for"] || request.connection.remoteAddress;
  const city = request.headers["x-vercel-ip-city"] || "Unknown";
  const regionCode = request.headers["x-vercel-ip-country-region"] || "Unknown";
  const countryCode = request.headers["x-vercel-ip-country"] || "Unknown";

  const countryName = countries.getName(countryCode, "en") || countryCode;

  let regionName = regionCode;
  try {
    const regionInfo = iso3166.subdivision(countryCode + "-" + regionCode);
    if (regionInfo && regionInfo.name) {
      regionName = regionInfo.name;
    }
  } catch (e) {
  }

  response.status(200).json({
    ip,
    city,
    region: regionName,
    country_name: countryName
  });
}
