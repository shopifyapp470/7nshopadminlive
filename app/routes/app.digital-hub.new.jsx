import { useState, useEffect } from "react";
import { useFetcher, useNavigate } from "react-router"; 
import { 
  Page, Layout, Card, TextField, Button, FormLayout, 
  Box, Checkbox, Frame, Toast 
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const name = String(data.name || "").trim();
  const url = String(data.url || "").trim();
  const isDownloadEnabled = data.download === "true";
  const downloadUrl = String(data.downloadUrl || "").trim();

  if (!name || !url) {
    return { error: "Name and URL are required fields." };
  }

  try {
    const existingLink = await db.digitalHubLink.findFirst({
      where: {
        shop: session.shop,
        OR: [
          { name: name },
          { url: url }
        ]
      }
    });

    if (existingLink) {
      const field = existingLink.name === name ? "Name" : "URL";
      return { 
        error: `This ${field} is already in your database.`, 
        success: false 
      };
    }

    await db.digitalHubLink.create({
      data: {
        name,
        url,
        description: String(data.description || "").trim(),
        category: String(data.category || "").trim(),
        tag: String(data.tag || "").trim(),
        download: isDownloadEnabled,
        downloadUrl: isDownloadEnabled ? downloadUrl : "",
        shop: session.shop,
        dateAdded: new Date(),
      },
    });

    return { success: true, message: "Link saved successfully!" };
  } catch (error) {
    console.error("Database Error:", error);
    return { error: "Internal Server Error. Please try again." };
  }
};
export default function NewDigitalHubLink() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  
  const isSaving = fetcher.state === "submitting";
  
  const [toastMsg, setToastMsg] = useState("");
  const [isToastError, setIsToastError] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [isDownload, setIsDownload] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (fetcher.data?.success) {
      setIsToastError(false);
      setToastMsg(fetcher.data.message);
      
      setName(""); setUrl(""); setDescription(""); setCategory(""); setTag("");
      setIsDownload(false); setDownloadUrl("");
      
      setTimeout(() => navigate("/app/digital-hub"), 2000);
    } else if (fetcher.data?.error) {
      setIsToastError(true);
      setToastMsg(fetcher.data.error);
    }
  }, [fetcher.data, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!url.trim()) newErrors.url = "URL is required";
    if (isDownload && !downloadUrl.trim()) {
      newErrors.downloadUrl = "Download URL is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toastMarkup = toastMsg ? (
    <Toast 
      content={toastMsg} 
      error={isToastError} 
      onDismiss={() => setToastMsg("")} 
    />
  ) : null;

  return (
    <Frame>
      <Page 
        title="Add New Digital Link" 
        backAction={{ content: 'Back', onAction: () => navigate("/app/digital-hub") }}
      >
        <Layout>
          <Layout.Section>
            <Card padding="500">
              <fetcher.Form method="POST" onSubmit={(e) => {
                if (!validateForm()) e.preventDefault();
              }}>
                <FormLayout>
                  <TextField 
                    label="Name" 
                    name="name" 
                    value={name} 
                    onChange={(v) => { setName(v); setErrors(prev => ({...prev, name: null})); }} 
                    autoComplete="off" 
                    requiredIndicator 
                    error={errors.name}
                  />
                  <TextField 
                    label="URL" 
                    name="url" 
                    type="url" 
                    value={url} 
                    onChange={(v) => { setUrl(v); setErrors(prev => ({...prev, url: null})); }} 
                    autoComplete="off" 
                    placeholder="https://example.com"
                    requiredIndicator 
                    error={errors.url}
                  />
                  <TextField 
                    label="Description" 
                    name="description" 
                    value={description} 
                    onChange={setDescription} 
                    multiline={3} 
                    autoComplete="off" 
                  />
                  
                  <Checkbox 
                    label="Enable Download" 
                    checked={isDownload} 
                    onChange={(v) => setIsDownload(v)} 
                  />
                  <input type="hidden" name="download" value={isDownload.toString()} />
                  
                  {isDownload && (
                    <TextField 
                      label="Download URL" 
                      name="downloadUrl" 
                      type="url"
                      value={downloadUrl} 
                      onChange={(v) => { setDownloadUrl(v); setErrors(prev => ({...prev, downloadUrl: null})); }} 
                      placeholder="https://example.com/file.zip"
                      autoComplete="off" 
                      requiredIndicator
                      error={errors.downloadUrl}
                    />
                  )}
                  <FormLayout.Group>
                    <TextField label="Category" name="category" value={category} onChange={setCategory} autoComplete="off" />
                    <TextField label="Tags" name="tag" value={tag} onChange={setTag} autoComplete="off" />
                  </FormLayout.Group>
                  
                  <Box paddingBlockStart="400">
                    <Button submit variant="primary" loading={isSaving} disabled={isSaving}>
                      Save Link
                    </Button>
                  </Box>
                </FormLayout>
              </fetcher.Form>
            </Card>
          </Layout.Section>
        </Layout>
        {toastMarkup}
      </Page>
    </Frame>
  );
}