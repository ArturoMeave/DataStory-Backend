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

// ─── NUEVO: FUNCIÓN PARA TRAER LOS DATOS REALES ───
export async function getShopifyData(shop: string, accessToken: string) {
  // Usamos la versión estable de la API de Shopify
  const API_VERSION = "2024-01";

  // Metemos la llave maestra en la "mochila" de la petición
  const headers = { "X-Shopify-Access-Token": accessToken };

  try {
    // Pedimos a la vez los productos y los pedidos (para que cargue más rápido)
    const [ordersRes, productsRes] = await Promise.all([
      axios.get(
        `https://${shop}/admin/api/${API_VERSION}/orders.json?status=any`,
        { headers },
      ),
      axios.get(`https://${shop}/admin/api/${API_VERSION}/products.json`, {
        headers,
      }),
    ]);

    const orders = ordersRes.data.orders || [];
    const products = productsRes.data.products || [];

    // Calculamos el dinero total sumando todos los pedidos
    const totalRevenue = orders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.total_price),
      0,
    );

    return {
      orderCount: orders.length,
      productCount: products.length,
      totalRevenue: totalRevenue,
      // Guardamos los 5 últimos pedidos para la gráfica/tabla
      recentOrders: orders.slice(0, 5).map((o: any) => ({
        id: o.id,
        orderNumber: o.name,
        total: parseFloat(o.total_price),
        date: o.created_at,
      })),
      orderList: orders.map((o: any) => ({
        id: o.id,
        orderNumber: o.name,
        customer: o.customer
          ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim()
          : "Cliente Anónimo",
        date: o.created_at,
        total: parseFloat(o.total_price),
        financialStatus: o.financial_status || "pending",
        fulfillmentStatus: o.fulfillment_status || "unfulfilled",
      })),
    };
  } catch (error) {
    console.error("Error descargando datos de Shopify:", error);
    throw new Error("Error al descargar los datos de la tienda.");
  }
}
