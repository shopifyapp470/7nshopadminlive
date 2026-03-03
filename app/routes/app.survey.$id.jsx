import { useState, useEffect } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { 
  Page, Layout, Card, TextField, Button, FormLayout, Box, 
  Select, Frame, Toast, BlockStack, Modal 
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  const survey = await db.survey.findUnique({ 
    where: { id: id, shop: session.shop } 
  });

  if (!survey) throw new Response("Survey Not Found", { status: 404 });

  return { survey };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);
  const { id } = params;

  if (data._action === "delete") {
    try {
      await db.survey.delete({ where: { id: id, shop: session.shop } });
      return { success: true, deleted: true };
    } catch (error) {
      return { success: false, message: "Deletion failed." };
    }
  }

  try {
    await db.survey.update({
      where: { id: id, shop: session.shop },
      data: {
        title: String(data.title),
        link: String(data.link),
        status: String(data.status),
      },
    });
    return { success: true, message: "Survey updated successfully!" };
  } catch (error) {
    return { success: false, message: "Update failed." };
  }
};

export default function EditSurvey() {
  const { survey } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  
  const [title, setTitle] = useState(survey.title || "");
  const [link, setLink] = useState(survey.link || ""); 
  const [status, setStatus] = useState(survey.status || "ACTIVE");
  const [showToast, setShowToast] = useState(false);
  const [activeModal, setActiveModal] = useState(false);

  const isUpdating = fetcher.state === "submitting" && fetcher.formData?.get("_action") !== "delete";
  const isDeleting = fetcher.state === "submitting" && fetcher.formData?.get("_action") === "delete";

  useEffect(() => {
    if (fetcher.data?.success) {
      if (fetcher.data.deleted) {
        navigate("/app/survey");
      } else {
        setShowToast(true);
      }
    }
  }, [fetcher.data, navigate]);

  const handleDelete = () => {
    fetcher.submit({ _action: "delete" }, { method: "POST" });
  };

  return (
    <Frame>
      <Page 
        title="Edit Survey" 
        backAction={{ content: 'Back', onAction: () => navigate("/app/survey") }}
        secondaryActions={[
          {
            content: 'Delete',
            destructive: true,
            onAction: () => setActiveModal(true),
          }
        ]}
      >
        <Layout>
          <Layout.Section>
            <Card padding="500">
              <fetcher.Form method="POST">
                <FormLayout>
                  <BlockStack gap="400">
                    <TextField 
                      label="Title" 
                      name="title" 
                      value={title} 
                      onChange={setTitle} 
                      autoComplete="off" 
                      requiredIndicator 
                    />
                    
                    <TextField 
                      label="Survey Link" 
                      name="link" 
                      value={link} 
                      onChange={setLink} 
                      autoComplete="off" 
                      requiredIndicator 
                      helpText="Select a form title in the Shopify app, copy the landing page URL, and paste it."
                    />

                    <Select
                      label="Status"
                      name="status"
                      options={[
                        { label: 'Active', value: 'ACTIVE' },
                        { label: 'Deactive', value: 'DEACTIVE' }
                      ]}
                      onChange={setStatus}
                      value={status}
                    />

                    <Box paddingBlockStart="200">
                      <Button 
                        submit 
                        variant="primary" 
                        loading={isUpdating}
                        disabled={!title || !link || isDeleting}
                      >
                        Update Survey
                      </Button>
                    </Box>
                  </BlockStack>
                </FormLayout>
              </fetcher.Form>
            </Card>
          </Layout.Section>
        </Layout>

        <Modal
          open={activeModal}
          onClose={() => setActiveModal(false)}
          title="Delete survey?"
          primaryAction={{
            content: 'Delete',
            onAction: handleDelete,
            destructive: true,
            loading: isDeleting,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setActiveModal(false),
            },
          ]}
        >
          <Modal.Section>
            <p>Are you sure you want to delete this survey?</p>
          </Modal.Section>
        </Modal>

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