import { useState, useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { Page, Layout, Card, TextField, Button, Box, Frame, Select, BlockStack, Text, FormLayout, Toast } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  let userInput = String(data.link).trim();
  let finalLink;

  if (userInput.includes(session.shop)) {
    finalLink = userInput.startsWith("http") ? userInput : `https://${userInput}`;
  } else {
    const cleanHandle = userInput.replace(/^\/+/g, '');
    finalLink = `https://${session.shop}/pages/${cleanHandle}`;
  }

  try {
    await db.survey.create({
      data: {
        title: String(data.title),
        link: finalLink, 
        status: String(data.status || "ACTIVE"),
        shop: session.shop
      },
    });
    return { success: true, message: "Survey created successfully!" };
  } catch (error) {
    return { success: false, error: "Database error occurred." };
  }
};

export default function NewSurvey() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  
  const isSaving = fetcher.state === "submitting";
  const [title, setTitle] = useState("");
  const [link, setLink] = useState(""); 
  const [status, setStatus] = useState("ACTIVE");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (fetcher.data?.success) {
      setShowToast(true);
      setTimeout(() => navigate("/app/survey"), 1500); 
    }
  }, [fetcher.data, navigate]);

  return (
    <Frame>
      <Page 
        title="Add New Survey" 
        backAction={{ content: 'Surveys', onAction: () => navigate("/app/survey") }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <fetcher.Form method="post">
                <FormLayout>
                  <BlockStack gap="500">
                    <Text variant="headingMd" as="h2">Survey Information</Text>
                    
                    <TextField 
                      label="Survey Title" 
                      name="title" 
                      value={title} 
                      onChange={setTitle} 
                      placeholder="e.g., Winter Feedback"
                      autoComplete="off" 
                      requiredIndicator
                    />

                    <TextField 
                      label="Survey Link" 
                      name="link" 
                      value={link} 
                      onChange={setLink} 
                      placeholder="e.g. test (or paste full URL)"
                      autoComplete="off" 
                      requiredIndicator
                      helpText="Select a form title in the Shopify app, copy the landing page URL, and paste it."
                    />

                    <Select 
                      label="Status" 
                      name="status" 
                      options={[
                        {label: 'Active', value: 'ACTIVE'}, 
                        {label: 'Deactive', value: 'DEACTIVE'}
                      ]} 
                      onChange={setStatus} 
                      value={status} 
                    />

                    <Box paddingBlockStart="200">
                      <Button 
                        submit 
                        variant="primary" 
                        loading={isSaving}
                        disabled={!title || !link || isSaving}
                      >
                        Create Survey
                      </Button>
                    </Box>
                  </BlockStack>
                </FormLayout>
              </fetcher.Form>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">Smart Link System</Text>
                <Text as="p" tone="subdued">
                  Go to the Shopify Forms app, select a title, copy the landing page URL and paste it.
                </Text>
                <ul style={{ paddingLeft: '20px', color: '#616161', fontSize: '13px' }}>
                  <li><b>Full URL:</b> <code>7nshop-test.myshopify.com/pages/test</code></li>
                </ul>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {showToast && (
          <Toast 
            content={fetcher.data?.message} 
            onDismiss={() => setShowToast(false)} 
          />
        )}
      </Page>
    </Frame>
  );
}