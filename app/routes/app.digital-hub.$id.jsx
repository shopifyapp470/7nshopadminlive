import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useNavigate } from "react-router"; // useFetcher add kiya
import { Page, Layout, Card, TextField, Button, FormLayout, Box, Checkbox, BlockStack, Toast, Frame } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const link = await db.digitalHubLink.findUnique({
    where: { id: params.id, shop: session.shop },
  });

  if (!link) throw new Response("Not Found", { status: 404 });
  return { link };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const isDownloadEnabled = data.download === "true";

  if (!data.name || !data.url) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    await db.digitalHubLink.update({
      where: { id: params.id, shop: session.shop },
      data: {
        name: String(data.name),
        url: String(data.url),
        description: String(data.description || ""),
        category: String(data.category || ""),
        tag: String(data.tag || ""),
        download: isDownloadEnabled,
        downloadUrl: isDownloadEnabled ? String(data.downloadUrl || "") : "",
      },
    });
    return { success: true, message: "Link updated successfully!" };
  } catch (e) {
    return { success: false, error: "Update failed" };
  }
};

export default function EditDigitalHubLink() {
  const { link } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  
  const isSubmitting = fetcher.state === "submitting";
  const [toastMsg, setToastMsg] = useState("");

  const [formState, setFormState] = useState({
    name: link.name,
    url: link.url,
    description: link.description || "",
    category: link.category || "",
    tag: link.tag || "",
    download: link.download || false,
    downloadUrl: link.downloadUrl || "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (fetcher.data?.success) {
      setToastMsg(fetcher.data.message);
    } else if (fetcher.data?.error) {
      setToastMsg(fetcher.data.error);
    }
  }, [fetcher.data]);

  const handleValidation = () => {
    const newErrors = {};
    if (!formState.name.trim()) newErrors.name = "Name is required";
    if (!formState.url.trim()) newErrors.url = "Main URL is required";
    if (formState.download && !formState.downloadUrl.trim()) {
      newErrors.downloadUrl = "Download URL is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <Frame>
      <Page 
        title={`Edit ${link.name}`} 
        backAction={{ content: 'Back', onAction: () => navigate("/app/digital-hub") }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <fetcher.Form method="POST" onSubmit={(e) => {
                if (!handleValidation()) e.preventDefault();
              }}>
                <FormLayout>
                  <TextField 
                    label="Name" 
                    name="name" 
                    value={formState.name} 
                    onChange={(v) => setFormState({...formState, name: v})} 
                    autoComplete="off" 
                    requiredIndicator
                    error={errors.name}
                  />                  
                  <TextField 
                    label="URL" 
                    name="url" 
                    type="url"
                    value={formState.url} 
                    onChange={(v) => setFormState({...formState, url: v})} 
                    autoComplete="off" 
                    placeholder="https://example.com"
                    requiredIndicator
                    error={errors.url}
                  />                 
                  <TextField 
                    label="Description" 
                    name="description" 
                    value={formState.description} 
                    onChange={(v) => setFormState({...formState, description: v})} 
                    multiline={3} 
                    autoComplete="off" 
                  />
                  <BlockStack gap="200">
                    <Checkbox 
                      label="Enable Download" 
                      checked={formState.download} 
                      onChange={(v) => setFormState({...formState, download: v})} 
                    />
                    <input type="hidden" name="download" value={formState.download.toString()} />
                  </BlockStack>
                  {formState.download && (
                    <TextField 
                      label="Download URL" 
                      name="downloadUrl" 
                      type="url"
                      value={formState.downloadUrl} 
                      onChange={(v) => setFormState({...formState, downloadUrl: v})} 
                      autoComplete="off" 
                      requiredIndicator
                      error={errors.downloadUrl}
                    />
                  )}
                  <TextField 
                    label="Category" 
                    name="category" 
                    value={formState.category} 
                    onChange={(v) => setFormState({...formState, category: v})} 
                    autoComplete="off" 
                  />
                  <TextField 
                    label="Tags" 
                    name="tag" 
                    value={formState.tag} 
                    onChange={(v) => setFormState({...formState, tag: v})} 
                    helpText="Separate tags with commas"
                    autoComplete="off" 
                  />
                  <Box paddingBlockStart="400">
                    <Button 
                      submit 
                      variant="primary" 
                      loading={isSubmitting}
                    >
                      Update Link
                    </Button>
                  </Box>
                </FormLayout>
              </fetcher.Form>
            </Card>
          </Layout.Section>
        </Layout>
        {toastMsg && <Toast content={toastMsg} onDismiss={() => setToastMsg("")} />}
      </Page>
    </Frame>
  );
}