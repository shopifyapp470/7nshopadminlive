import { useState, useEffect } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { 
  Page, Layout, Card, ResourceList, ResourceItem, Text, Badge, 
  InlineStack, Button, Box, Frame, BlockStack, Toast, Modal 
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const surveys = await db.survey.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" } 
  });
  return { surveys };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = formData.get("id");
  const intent = formData.get("intent");

  if (intent === "DELETE") {
    try {
      await db.surveyResponse.deleteMany({ where: { surveyId: id } });
      await db.survey.delete({ where: { id: id, shop: session.shop } });
      return { success: true, message: "Survey deleted successfully!" };
    } catch (error) {
      return { success: false, message: "Failed to delete survey." };
    }
  }
  return null;
};

export default function SurveyIndex() {
  const { surveys } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher(); 
  
  const [activeModal, setActiveModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (fetcher.data?.message) {
      setShowToast(true);
    }
  }, [fetcher.data]);

  const openDeleteModal = (id) => {
    setSelectedId(id);
    setActiveModal(true);
  };

  const handleDelete = () => {
    fetcher.submit({ id: selectedId, intent: "DELETE" }, { method: "POST" });
    setActiveModal(false);
  };

  return (
    <Frame>
      <Page 
        title="Surveys" 
        primaryAction={{ 
          content: 'Create Survey', 
          onAction: () => navigate("/app/survey/new") 
        }}
      >
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <ResourceList
                resourceName={{ singular: 'survey', plural: 'surveys' }}
                items={surveys}
                loading={fetcher.state === "submitting"}
                renderItem={(item) => {
                  const { id, title, status } = item;
                  return (
                    <ResourceItem id={id} selectable={false}>
                      <Box padding="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <div style={{ flex: 1 }}>
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="bold" as="span">{title}</Text>
                              <div style={{ maxWidth: 'fit-content' }}>
                                <Badge tone={status === "ACTIVE" ? "success" : "attention"}>{status}</Badge>
                              </div>
                            </BlockStack>
                          </div>
                          <InlineStack gap="200">
                            <Button onClick={() => navigate(`/app/survey/${id}`)}>Edit</Button>
                            <Button 
                              tone="critical" 
                              onClick={() => openDeleteModal(id)} 
                            >
                              Delete
                            </Button>
                          </InlineStack>
                        </InlineStack>
                      </Box>
                    </ResourceItem>
                  );
                }}
              />
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
            loading: fetcher.state === "submitting",
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setActiveModal(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to delete this survey?
            </Text>
          </Modal.Section>
        </Modal>

        {showToast && (
          <Toast 
            content={fetcher.data?.message} 
            error={!fetcher.data?.success}
            onDismiss={() => setShowToast(false)} 
          />
        )}
      </Page>
    </Frame>
  );
}