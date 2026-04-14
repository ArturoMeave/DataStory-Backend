import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
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
    throw new Error("No se pudo obtener el token");
  }
}

// ─── 1. EL BIBLIOTECARIO (Sincroniza Shopify -> Prisma) ───
export async function syncShopifyStore(
  userId: string,
  shop: string,
  accessToken: string,
) {
  const API_VERSION = "2024-01";
  const headers = { "X-Shopify-Access-Token": accessToken };

  try {
    const [ordersRes, productsRes, customersRes] = await Promise.all([
      axios.get(
        `https://${shop}/admin/api/${API_VERSION}/orders.json?status=any&limit=250`,
        { headers },
      ),
      axios.get(
        `https://${shop}/admin/api/${API_VERSION}/products.json?limit=250`,
        { headers },
      ),
      axios.get(
        `https://${shop}/admin/api/${API_VERSION}/customers.json?limit=250`,
        { headers },
      ),
    ]);

    const orders = ordersRes.data.orders || [];
    const products = productsRes.data.products || [];
    const customers = customersRes.data.customers || [];

    for (const o of orders) {
      await prisma.shopifyCachedOrder.upsert({
        where: { id: o.id.toString() },
        update: {
          financialStatus: o.financial_status || "pending",
          fulfillmentStatus: o.fulfillment_status || "unfulfilled",
          total: parseFloat(o.total_price),
        },
        create: {
          id: o.id.toString(),
          userId,
          orderNumber: o.name,
          customerName: o.customer
            ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim()
            : "Cliente Anónimo",
          date: new Date(o.created_at),
          total: parseFloat(o.total_price),
          financialStatus: o.financial_status || "pending",
          fulfillmentStatus: o.fulfillment_status || "unfulfilled",
        },
      });
    }

    for (const p of products) {
      await prisma.shopifyCachedProduct.upsert({
        where: { id: p.id.toString() },
        update: {
          title: p.title,
          image: p.image?.src || null,
          status: p.status,
          inventory: p.variants.reduce(
            (sum: number, v: any) => sum + (v.inventory_quantity || 0),
            0,
          ),
          price: parseFloat(p.variants[0]?.price || "0"),
        },
        create: {
          id: p.id.toString(),
          userId,
          title: p.title,
          image: p.image?.src || null,
          status: p.status,
          inventory: p.variants.reduce(
            (sum: number, v: any) => sum + (v.inventory_quantity || 0),
            0,
          ),
          price: parseFloat(p.variants[0]?.price || "0"),
        },
      });
    }

    for (const c of customers) {
      await prisma.shopifyCachedCustomer.upsert({
        where: { id: c.id.toString() },
        update: {
          ordersCount: c.orders_count || 0,
          totalSpent: parseFloat(c.total_spent || "0"),
          verified: !!c.verified_email,
        },
        create: {
          id: c.id.toString(),
          userId,
          name:
            `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sin Nombre",
          email: c.email || "Sin Email",
          ordersCount: c.orders_count || 0,
          totalSpent: parseFloat(c.total_spent || "0"),
          verified: !!c.verified_email,
        },
      });
    }
  } catch (error) {
    console.error("Error sincronizando tienda:", error);
  }
}

// ─── 2. EL LECTOR (Lee desde Prisma) ───
export async function getShopifyData(userId: string) {
  const [orders, products, customers] = await Promise.all([
    prisma.shopifyCachedOrder.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    }),
    prisma.shopifyCachedProduct.findMany({ where: { userId } }),
    prisma.shopifyCachedCustomer.findMany({
      where: { userId },
      orderBy: { totalSpent: "desc" },
    }),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return {
    orderCount: orders.length,
    productCount: products.length,
    totalRevenue,
    recentOrders: orders.slice(0, 5),
    productList: products,
    orderList: orders,
    customerList: customers,
  };
}

export async function handleOrderWebhook(shop: string, orderData: any) {
  try {
    const connection = await prisma.shopifyConnection.findFirst({
      where: { shop: shop },
    });

    if (!connection) return;

    await prisma.shopifyCachedOrder.upsert({
      where: { id: orderData.id.toString() },
      update: {
        financialStatus: orderData.financial_status || "pending",
        fulfillmentStatus: orderData.fulfillment_status || "unfulfilled",
        total: parseFloat(orderData.total_price),
      },
      create: {
        id: orderData.id.toString(),
        userId: connection.userId,
        orderNumber: orderData.name,
        customerName: orderData.customer
          ? `${orderData.customer.first_name || ""} ${orderData.customer.last_name || ""}`.trim()
          : "Cliente Anónimo",
        date: new Date(orderData.created_at),
        total: parseFloat(orderData.total_price),
        financialStatus: orderData.financial_status || "pending",
        fulfillmentStatus: orderData.fulfillment_status || "unfulfilled",
      },
    });
  } catch (error) {
    console.error("Error procesando el webhook de pedidos:", error);
  }
}
