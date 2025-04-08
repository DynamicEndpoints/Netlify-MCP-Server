import fetch from "node-fetch";

const NETLIFY_API_BASE_URL = "https://api.netlify.com/api/v1";

export async function callNetlifyApi(endpoint, method = "GET", token, body = null) {
  const url = `${NETLIFY_API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };
  
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Netlify API error (${response.status}): ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error calling Netlify API:", error);
    throw error;
  }
}
