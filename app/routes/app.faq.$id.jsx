import { useState, useEffect, useMemo, useCallback } from "react";
import { useLoaderData, useNavigate, redirect, Form, useNavigation, useSubmit, useActionData } from "react-router";
import { Page, Layout, Card, TextField, Button, FormLayout, Box, InlineGrid, Text, BlockStack, Frame, Toast } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

import 'react-quill/dist/quill.snow.css';

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const faq = await db.fAQ.findUnique({ where: { id: params.id, shop: session.shop } });
  if (!faq) throw new Response("Not Found", { status: 404 });
  return { faq };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  await db.fAQ.update({
    where: { id: params.id },
    data: {
      question: String(data.question),
      answer: String(data.answer),
      category: String(data.category || ""),
      tag: String(data.tag || ""),
      displayDate: new Date(data.displayDate),
    },
  });

  return { success: true };
};

export default function EditFAQ() {
  const { faq } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const nav = useNavigation();
  const submit = useSubmit();

  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [category, setCategory] = useState(faq.category || "");
  const [tag, setTag] = useState(faq.tag || "");
  const [displayDate, setDisplayDate] = useState(new Date(faq.displayDate).toISOString().split('T')[0]);
  
  const [activeToast, setActiveToast] = useState(false);
  const toggleActiveToast = useCallback(() => setActiveToast((active) => !active), []);

  const [ReactQuill, setReactQuill] = useState(null);

  useEffect(() => {
    import('react-quill').then((module) => {
      const Quill = module.default.Quill;

      const Size = Quill.import('attributors/style/size');
      Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px'];
      Quill.register(Size, true);

      const Font = Quill.import('attributors/style/font');
      Font.whitelist = ['sans-serif', 'serif', 'monospace'];
      Quill.register(Font, true);

      const AlignStyle = Quill.import('attributors/style/align');
      Quill.register(AlignStyle, true);
      
      setReactQuill(() => module.default);
    });
  }, []);

  useEffect(() => {
    if (actionData?.success) {
      setActiveToast(true);
    }
  }, [actionData]);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'font': ['sans-serif', 'serif', 'monospace'] }],
      [{ 'size': ['10px', '12px', '14px', '16px', '18px', '20px', '24px'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }], 
      ['link'],
      ['clean'],
    ],
  }), []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("answer", answer);
    submit(formData, { method: "post" });
  };

  return (
    <Frame>
      <Page title="Edit FAQ" backAction={{ content: 'Back', onAction: () => navigate("/app/faq") }}>
        <Layout>
          <Layout.Section>
            <Form method="POST" onSubmit={handleSubmit}>
              <BlockStack gap="500">
                <Card>
                  <FormLayout>
                    <TextField label="Question" name="question" value={question} onChange={setQuestion} autoComplete="off" requiredIndicator />
                    <Box>
                      <div style={{ marginBottom: '8px' }}>
                        <Text as="p" variant="bodyMd" fontWeight="bold">Answer *</Text>
                      </div>
                      <div className="advanced-editor-wrapper">
                        {ReactQuill ? (
                          <ReactQuill 
                            theme="snow" 
                            value={answer} 
                            onChange={setAnswer} 
                            modules={modules}
                            placeholder="Type your answer here..."
                          />
                        ) : (
                          <div style={{ height: '200px', background: '#f6f6f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text tone="subdued">Loading Editor...</Text>
                          </div>
                        )}
                      </div>
                    </Box>
                  </FormLayout>
                </Card>

                <Card>
                  <InlineGrid columns={{xs: 1, sm: 3}} gap="400">
                    <TextField label="Category" name="category" value={category} onChange={setCategory} autoComplete="off" />
                    <TextField label="Tag" name="tag" value={tag} onChange={setTag} autoComplete="off" />
                    <TextField label="Display Date" name="displayDate" type="date" value={displayDate} onChange={setDisplayDate} autoComplete="off" />
                  </InlineGrid>
                </Card>

                <div style={{ textAlign: 'right', marginBottom: '40px' }}>
                  <Button submit variant="primary" loading={nav.state === "submitting"}>
                    Update FAQ
                  </Button>
                </div>
              </BlockStack>
            </Form>
          </Layout.Section>
        </Layout>
        {activeToast && <Toast content="FAQ Updated Successfully" onDismiss={toggleActiveToast} />}
      </Page>

      <style>{`
        .advanced-editor-wrapper { border: 1px solid #bdc1c6; border-radius: 8px; overflow: hidden; }
        .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #bdc1c6; background: #f1f1f1; padding: 8px; }
        .ql-container.ql-snow { border: none; min-height: 250px; }
        .ql-editor { min-height: 250px; font-size: 14px; }

        /* Font Size dropdown label fix */
        .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          content: attr(data-value) !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before { content: 'Normal' !important; }

        /* Font Family dropdown label fix */
        .ql-snow .ql-picker.ql-font .ql-picker-label::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item::before {
          content: attr(data-value) !important;
        }

        .ql-align-center { text-align: center; }
        .ql-align-right { text-align: right; }
        .ql-align-left { text-align: left; }
      `}</style>
    </Frame>
  );
}