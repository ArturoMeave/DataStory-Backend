import axios from "axios";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const REDIRECT_URI = "http://localhost:3001/api/auth/shopify/callback";

export function getShopifyAuthUrl(shop: string, userId: string) {
  const scopes = "read_orders,read_products,read_customers,read_inventory";
  return `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${REDIRECT_URI}&state=${userId}`;
}

export async function exchangeShopifyToken(shop: string, code: string) {
  const url = `https://${shop}/admin/oauth/access_token`;

  try {
    const response = await axios.post(url, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    });
    return response.data.access_token;
  } catch (error) {
    console.error("Error obteniendo el token de Shopify:", error);
    throw new Error("No se pudo obtener el token");
  }
}
