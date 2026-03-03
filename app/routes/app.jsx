import { Outlet, useLoaderData, useRouteError, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris"; // Polaris wala provider
import enTranslations from "@shopify/polaris/locales/en.json"; // Translations import karein
import { authenticate } from "../shopify.server";
import "@shopify/polaris/build/esm/styles.css";
export const loader = async ({ request }) => {
  await authenticate.admin(request);
 
  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};
 
export default function App() {
  const { apiKey } = useLoaderData();
 
  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={enTranslations}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/additional">Additional page</s-link>
        <s-link href="/app/pointconfig">Point Configuration</s-link>
        <s-link href="/app/clevetapconfig">Clevertap Settings</s-link>
        <s-link href="/app/digital-hub">Digital Hub</s-link>
        <s-link href="/app/digital-hub-response">Digital Hub Response</s-link>
        <s-link href="/app/faq">Faqs</s-link>
        <s-link href="/app/survey">Survey</s-link>
        <s-link href="/app/survey-response">Survey Response</s-link>
        <s-link href="/app/download">Download Dashboard</s-link>
        <s-link href="/app/refferal-point">Referral Dashboard</s-link>
      </s-app-nav>
      <Outlet />
      </PolarisAppProvider>
    </ShopifyAppProvider>
  );
}
 
// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
 
export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};