import { useState, useEffect, useMemo, useCallback } from "react";
import { redirect, Form, useNavigation, useNavigate, useSubmit } from "react-router";
import { Page, Layout, Card, TextField, Button, FormLayout, Box, InlineGrid, Text, BlockStack, Frame } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

import 'react-quill/dist/quill.snow.css';

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  await db.fAQ.create({
    data: {
      question: String(data.question),
      answer: String(data.answer),
      category: String(data.category || ""),
      tag: String(data.tag || ""),
      displayDate: new Date(data.displayDate),
      shop: session.shop,
    },
  });

  return redirect("/app/faq");
};

export default function NewFAQ() {
  const nav = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [displayDate, setDisplayDate] = useState(new Date().toISOString().split('T')[0]);

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
      <Page title="Add New FAQ" backAction={{ content: 'Back', onAction: () => navigate("/app/faq") }}>
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
                    <InlineGrid columns={{xs: 1, sm: 3}} gap="400">
                      <TextField label="Category" name="category" value={category} onChange={setCategory} autoComplete="off" />
                      <TextField label="Tag" name="tag" value={tag} onChange={setTag} autoComplete="off" />
                      <TextField label="Display Date" name="displayDate" type="date" value={displayDate} onChange={setDisplayDate} autoComplete="off" />
                    </InlineGrid>
                    <Box paddingBlockStart="400">
                      <Button submit variant="primary" loading={nav.state === "submitting"}>Save FAQ</Button>
                    </Box>
                  </FormLayout>
                </Card>
              </BlockStack>
            </Form>
          </Layout.Section>
        </Layout>
      </Page>

      <style>{`
        .advanced-editor-wrapper { border: 1px solid #bdc1c6; border-radius: 8px; overflow: hidden; }
        .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #bdc1c6; background: #f1f1f1; padding: 8px; }
        .ql-container.ql-snow { border: none; min-height: 250px; }
        .ql-editor { min-height: 250px; font-size: 14px; }

        .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          content: attr(data-value) !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before { content: 'Normal' !important; }

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