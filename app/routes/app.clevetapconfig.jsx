import { useState, useEffect } from "react";
import { Form, useLoaderData, useActionData, useNavigation, data } from "react-router";
import { Page, Layout, Card, FormLayout, TextField, Button, Banner, Text, AppProvider, BlockStack } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const config = await db.cleverTapConfig.findUnique({
    where: { shop: session.shop },
  });

  return { 
    accountId: config?.accountId || "",
    passcode: config?.passcode || "",
    walletId: config?.walletId || "",
    region: config?.region || "in1" 
  };
};
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const updateData = {
    accountId: formData.get("accountId") || "",
    passcode: formData.get("passcode") || "",
    walletId: formData.get("walletId") || "",
    region: formData.get("region") || "in1",
  };

  try {
    await db.cleverTapConfig.upsert({
      where: { shop: session.shop },
      update: updateData,
      create: { shop: session.shop, ...updateData },
    });
    return data({ status: "success" });
  } catch (error) {
    console.error("[CLEVERTAP SAVE ERROR]", error);
    return data({ status: "error", message: error.message });
  }
};
export default function CleverTapSettingsPage() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const nav = useNavigation();

  const [accId, setAccId] = useState(loaderData.accountId);
  const [pass, setPass] = useState(loaderData.passcode);
  const [wallet, setWallet] = useState(loaderData.walletId);
  const [reg, setReg] = useState(loaderData.region);

  useEffect(() => {
    if (loaderData) {
      setAccId(loaderData.accountId);
      setPass(loaderData.passcode);
      setWallet(loaderData.walletId);
      setReg(loaderData.region);
    }
  }, [loaderData]);

  const isSaving = nav.state === "submitting";
  return (
    <AppProvider i18n={enTranslations}>
      <Page title="CleverTap Configuration">
        <Layout>
          <Layout.Section>
            
            {actionData?.status === "success" && (
              <div style={{ marginBottom: "20px" }}>
                <Banner title="Settings Saved" tone="success">
                  <p>CleverTap account details and region settings updated successfully.</p>
                </Banner>
              </div>
            )}

            {actionData?.status === "error" && (
              <div style={{ marginBottom: "20px" }}>
                <Banner title="Save Failed" tone="critical">
                  <p>{actionData.message}</p>
                </Banner>
              </div>
            )}

            <Card>
              <Form method="post">
                <FormLayout>
                  <Text variant="headingMd" as="h2">API Credentials</Text>
                  <BlockStack gap="400">
                    <TextField
                      label="CleverTap Account ID"
                      name="accountId"
                      value={accId}
                      onChange={(v) => setAccId(v)}
                      autoComplete="off"
                      placeholder="e.g. TEST-WR9-RRR-ZZZZ"
                    />
                    <TextField
                      label="CleverTap Passcode"
                      name="passcode"
                      type="password"
                      value={pass}
                      onChange={(v) => setPass(v)}
                      autoComplete="off"
                      placeholder="Enter your passcode"
                    />
                    <TextField
                      label="Wallet ID"
                      name="walletId"
                      value={wallet}
                      onChange={(v) => setWallet(v)}
                      autoComplete="off"
                      placeholder="e.g. 1198"
                    />
                    <TextField
                      label="Region"
                      name="region"
                      value={reg}
                      onChange={(v) => setReg(v)}
                      autoComplete="off"
                      helpText="Default region is in1"
                      placeholder="in1"
                    />
                  </BlockStack>
                  <div style={{ marginTop: '24px' }}>
                    <Button submit variant="primary" loading={isSaving}>
                      Save Configuration
                    </Button>
                  </div>
                </FormLayout>
              </Form>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}