export default function handler(request, response) {
  const apiKey = request.query.key;

  const validApiKey = process.env.API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return response.status(401).json({
      error: "Invalid or missing API key"
    });
  }

  const ip = request.headers['x-forwarded-for'] || 
             request.connection.remoteAddress;
  
  const city = request.headers['x-vercel-ip-city'] || 'Unknown';
  const region = request.headers['x-vercel-ip-country-region'] || 'Unknown';
  const country = request.headers['x-vercel-ip-country'] || 'Unknown';
  
  response.status(200).json({
    ip: ip,
    city: city,
    region: region,
    country_name: country
  });
}
