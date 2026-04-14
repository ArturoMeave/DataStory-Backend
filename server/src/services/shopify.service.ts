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

export async function getShopifyData(shop: string, accessToken: string) {
  const API_VERSION = "2024-01";
  const headers = { "X-Shopify-Access-Token": accessToken };

  try {
    const [ordersRes, productsRes, customersRes] = await Promise.all([
      axios.get(
        `https://${shop}/admin/api/${API_VERSION}/orders.json?status=any`,
        { headers },
      ),
      axios.get(`https://${shop}/admin/api/${API_VERSION}/products.json`, {
        headers,
      }),
      axios.get(`https://${shop}/admin/api/${API_VERSION}/customers.json`, {
        headers,
      }),
    ]);

    const orders = ordersRes.data.orders || [];
    const products = productsRes.data.products || [];
    const customers = customersRes.data.customers || [];

    const totalRevenue = orders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.total_price),
      0,
    );

    return {
      orderCount: orders.length,
      productCount: products.length,
      totalRevenue: totalRevenue,
      recentOrders: orders.slice(0, 5).map((o: any) => ({
        id: o.id,
        orderNumber: o.name,
        total: parseFloat(o.total_price),
        date: o.created_at,
      })),
      productList: products.map((p: any) => ({
        id: p.id,
        title: p.title,
        image: p.image?.src || null,
        status: p.status,
        inventory: p.variants.reduce(
          (sum: number, v: any) => sum + (v.inventory_quantity || 0),
          0,
        ),
        price: p.variants[0]?.price || "0.00",
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
      customerList: customers.map((c: any) => ({
        id: c.id,
        name:
          `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sin Nombre",
        email: c.email || "Sin Email",
        ordersCount: c.orders_count || 0,
        totalSpent: parseFloat(c.total_spent || "0"),
        verified: c.verified_email,
      })),
    };
  } catch (error) {
    console.error("Error descargando datos de Shopify:", error);
    throw new Error("Error al descargar los datos de la tienda.");
  }
}
