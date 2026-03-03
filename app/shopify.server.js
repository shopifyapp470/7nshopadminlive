import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { syncRewardTemplate } from "./lib/theme-sync.server";
import { Session } from "@shopify/shopify-api";


const customSessionStorage = {
  storeSession: async (session) => {
    const data = session.toObject();
    const id = data.id;
    // Yahan default empty string add kar rahe hain agar token missing ho
    const sessionToSave = {
      ...data,
      accessToken: data.accessToken || "", // Default value
    };
    const { id: _id, ...updateData } = sessionToSave; 
    await prisma.session.upsert({
      where: { id },
      update: updateData,
      create: sessionToSave,
    });
    return true;
  },
  loadSession: async (id) => {
    const sessionData = await prisma.session.findUnique({ where: { id } });
    if (sessionData) {
      return new Session(sessionData);
    }
    return undefined;
  },
  deleteSession: async (id) => {
    await prisma.session.delete({ where: { id } });
    return true;
  },
  deleteSessions: async (ids) => {
    await prisma.session.deleteMany({ where: { id: { in: ids } } });
    return true;
  },
  findSessionsByShop: async (shop) => {
    const sessions = await prisma.session.findMany({ where: { shop } });
    return sessions.map((session) => new Session(session));
  },
};


const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  //sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  sessionStorage: customSessionStorage,

    hooks: {
    afterAuth: async ({ admin, session }) => {
      console.log(`🚀 App Install Event: ${session.shop}`);
      try {
        await syncRewardTemplate(admin, session);
        console.log("✅ Auto-sync completed on install.");
      } catch (error) {
        console.error("❌ Auto-sync failed:", error.message);
      }
    },
  },
  
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
