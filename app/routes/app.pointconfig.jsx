import { useState, useEffect } from "react";
import { Form, useLoaderData, useActionData, useNavigation, data } from "react-router";
import { Page, Layout, Card, FormLayout, TextField, Button, Banner, Text, AppProvider, BlockStack, Select } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await db.userSetting.findUnique({
    where: { shop: session.shop },
  });

  return { 
    birthdayPoint: settings?.birthdayPoint || 10,
    anniversaryPoint: settings?.anniversaryPoint || 5,
    earnPercentage: settings?.earnPercentage || 1,
    redeemPercentage: settings?.redeemPercentage || 0,
    minOrderTotal: settings?.minOrderTotal || 0,
    fixedRewardPoint: settings?.fixedRewardPoint || 0,
    referralPoint: settings?.referralPoint || 0,
    rewardDelay: settings?.rewardDelay || "120000"
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const updateData = {
    birthdayPoint: parseInt(formData.get("birthdayPoint") || "0"),
    anniversaryPoint: parseInt(formData.get("anniversaryPoint") || "0"),
    earnPercentage: parseInt(formData.get("earnPercentage") || "0"),
    redeemPercentage: parseInt(formData.get("redeemPercentage") || "0"),
    minOrderTotal: parseFloat(formData.get("minOrderTotal") || "0"),
    fixedRewardPoint: parseInt(formData.get("fixedRewardPoint") || "0"),
    referralPoint: parseInt(formData.get("referralPoint") || "0"),
    rewardDelay: formData.get("rewardDelay"),
  };

  try {
    await db.userSetting.upsert({
      where: { shop: session.shop },
      update: updateData,
      create: { shop: session.shop, ...updateData },
    });
    return data({ status: "success" });
  } catch (error) {
    console.error(" [DB SAVE ERROR]", error);
    return data({ status: "error", message: error.message });
  }
};
export default function BirthdayPage() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const nav = useNavigation();
  const [bPoints, setBPoints] = useState(loaderData?.birthdayPoint ?? 0);
  const [aPoints, setAPoints] = useState(loaderData?.anniversaryPoint ?? 0);
  const [earnPct, setEarnPct] = useState(loaderData?.earnPercentage ?? 0);
  const [redeemPct, setRedeemPct] = useState(loaderData?.redeemPercentage ?? 0);
  const [minOrder, setMinOrder] = useState(loaderData?.minOrderTotal ?? 0);
  const [fPoints, setFPoints] = useState(loaderData?.fixedRewardPoint ?? 0);
  const [rePoints, setrePoints] = useState(loaderData?.referralPoint ?? 0);
  const [delay, setDelay] = useState(loaderData?.rewardDelay ?? "120000");

  useEffect(() => {
    if (loaderData) {
      setBPoints(loaderData.birthdayPoint);
      setAPoints(loaderData.anniversaryPoint);
      setEarnPct(loaderData.earnPercentage);
      setRedeemPct(loaderData.redeemPercentage);
      setMinOrder(loaderData.minOrderTotal);
      setFPoints(loaderData.fixedRewardPoint);
      setrePoints(loaderData.referralPoint);
      setDelay(loaderData.rewardDelay);
    }
  }, [loaderData]);

  const delayOptions = [
    {label: '2 Minutes', value: '120000'},
    {label: '5 Minutes', value: '300000'},
    {label: '1 Day', value: '86400000'},
    {label: '2 Days', value: '172800000'},
    {label: '5 Days', value: '432000000'},
    {label: '7 Days', value: '604800000'},
    {label: '10 Days', value: '864000000'},
  ];

  const isSaving = nav.state === "submitting";

  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Reward Strategy Settings">
        <Layout>
          <Layout.Section>
            {actionData?.status === "success" && (
              <div style={{ marginBottom: "20px" }}>
                <Banner title="Settings Saved" tone="success" onDismiss={() => {}}>
                  <p>All reward points, thresholds, and strategy settings have been updated successfully.</p>
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
                  <Text variant="headingMd" as="h2">Special Event Rewards</Text>
                  <BlockStack gap="400">
                    <TextField
                      label="Birthday Points"
                      type="number"
                      name="birthdayPoint"
                      value={String(bPoints)}
                      onChange={(v) => setBPoints(v)}
                      autoComplete="off"
                      helpText="Points awarded on customer's birthday"
                    />
                    <TextField
                      label="Anniversary Points"
                      type="number"
                      name="anniversaryPoint"
                      value={String(aPoints)}
                      onChange={(v) => setAPoints(v)}
                      autoComplete="off"
                      helpText="Points awarded on account anniversary"
                    />
                  </BlockStack>
                  <div style={{ marginTop: '20px' }}>
                    <Text variant="headingMd" as="h2">Earning Strategy</Text>
                  </div>
                  <BlockStack gap="400">
                    {/* <TextField
                      label="Earning Percentage for First Order (%)"
                      type="number"
                      name="earnPercentage"
                      value={String(earnPct)}
                      onChange={(v) => setEarnPct(v)}
                      suffix="%"
                      helpText="Points calculation for the very first order."
                      autoComplete="off"
                    /> */}
                     <TextField
                      label="Referral Points"
                      type="number"
                      name="referralPoint"
                      value={String(rePoints)}
                      onChange={(v) => setrePoints(v)}
                      autoComplete="off"
                      helpText="Points awarded on customer's referral"
                    />
                    {/* <Select
                      label="Reward Activation Delay"
                      name="rewardDelay"
                      options={delayOptions}
                      onChange={(value) => setDelay(value)}
                      value={delay}
                      helpText="Points will move from Pending to Active after this duration."
                    /> */}
                  </BlockStack>
                  <div style={{ marginTop: '24px' }}>
                    <Button submit variant="primary" loading={isSaving}>
                      Save All Settings
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