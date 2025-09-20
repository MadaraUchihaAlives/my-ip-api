// Handle API requests
export default function handler(request, response) {
  // Get client IP address
  const ip = request.headers['x-forwarded-for'] || 
             request.connection.remoteAddress;
  
  // Get location data from request headers (provided by Vercel)
  const city = request.headers['x-vercel-ip-city'] || 'Unknown';
  const region = request.headers['x-vercel-ip-country-region'] || 'Unknown';
  const country = request.headers['x-vercel-ip-country'] || 'Unknown';
  
  // Return JSON response with only the requested fields
  response.status(200).json({
    ip: ip,
    city: city,
    region: region,
    country_name: country
  });
}