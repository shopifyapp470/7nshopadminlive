import { useState, useRef, useEffect } from "react";
import { useLoaderData, useNavigate, useSubmit, useActionData } from "react-router";
import * as XLSX from "xlsx";
import { Page, Card, ResourceList, ResourceItem, Text, Badge, Button, InlineStack, 
  Pagination, Modal, Frame, Box, Toast, TextField, BlockStack, ProgressBar, Banner
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("query") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10; 
  
  const totalCount = await db.fAQ.count({
    where: { shop: session.shop, question: { contains: query, mode: 'insensitive' } }
  });

  const faqs = await db.fAQ.findMany({
    where: { shop: session.shop, question: { contains: query, mode: 'insensitive' } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const existingFAQs = await db.fAQ.findMany({
    where: { shop: session.shop },
    select: { question: true }
  });

  return { 
    faqs, 
    query, 
    currentPage: page, 
    totalPages: Math.ceil(totalCount / pageSize), 
    hasNextPage: page < Math.ceil(totalCount / pageSize), 
    hasPreviousPage: page > 1,
    existingQuestionList: existingFAQs.map(f => f.question.toLowerCase())
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const _action = formData.get("_action");

  if (request.method === "DELETE") {
    const id = formData.get("id");
    await db.fAQ.delete({ where: { id: id, shop: session.shop } });
    return { success: true, message: "FAQ deleted successfully" };
  }
  if (_action === "IMPORT_BATCH") {
    const data = JSON.parse(formData.get("data"));
    const dataWithShop = data.map(item => ({ ...item, shop: session.shop }));
    await db.fAQ.createMany({ data: dataWithShop });
    return { success: true };
  }
  if (_action === "EXPORT_FAQS") {
    const allFaqs = await db.fAQ.findMany({ where: { shop: session.shop } });
    const exportData = allFaqs.map(f => ({ Question: f.question, Answer: f.answer, Category: f.category, Tags: f.tag }));
    return { success: true, exportData, fileName: `FAQs_Export.csv` };
  }
  return { success: false };
};

export default function FAQIndex() {
  const { faqs, query, currentPage, hasNextPage, hasPreviousPage, existingQuestionList } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const fileInputRef = useRef(null);

  const [searchValue, setSearchValue] = useState(query);
  const [activeModal, setActiveModal] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (actionData?.message) setToastMsg(actionData.message);
    if (actionData?.exportData) {
      const worksheet = XLSX.utils.json_to_sheet(actionData.exportData);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = actionData.fileName;
      link.click();
    }
  }, [actionData]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setProgress(0);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const existingSet = new Set(existingQuestionList);
      let validData = [];
      let duplicates = 0;
      rawData.forEach(row => {
        const q = (row.Question || row.question || "").toString().trim();
        const a = (row.Answer || row.answer || "").toString().trim();
        
        if (q && a) {
          if (existingSet.has(q.toLowerCase())) {
            duplicates++;
          } else {
            validData.push({
              question: q,
              answer: a,
              category: (row.Category || row.category || "General").toString(),
              tag: (row.Tag || row.Tags || row.tag || "").toString()
            });
            existingSet.add(q.toLowerCase());
          }
        }
      });

      if (validData.length === 0) {
        setSummary({ added: 0, skipped: duplicates });
        setIsImporting(false);
        return;
      }

      const BATCH_SIZE = 10;
      for (let i = 0; i < validData.length; i += BATCH_SIZE) {
        const batch = validData.slice(i, i + BATCH_SIZE);
        const formData = new FormData();
        formData.append("_action", "IMPORT_BATCH");
        formData.append("data", JSON.stringify(batch));
        await fetch(window.location.pathname, { method: "POST", body: formData });
        const currentProgress = Math.min(Math.round(((i + BATCH_SIZE) / validData.length) * 100), 100);
        setProgress(currentProgress);
      }

      setSummary({ added: validData.length, skipped: duplicates });
      setIsImporting(false);
      navigate(".", { replace: true });
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ""; 
  };

  return (
    <Frame>
      <Page 
        title="FAQ Management" 
        fullWidth
        primaryAction={{ content: 'Add FAQ', onAction: () => navigate("/app/faq/new") }}
        secondaryActions={[
          { content: 'Bulk Upload', onAction: () => fileInputRef.current?.click(), disabled: isImporting },
          { content: 'Export', onAction: () => submit({ _action: "EXPORT_FAQS" }, { method: "POST" }) }
        ]}
      >
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
        
        <BlockStack gap="400">
          {isImporting && (
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text variant="headingSm" as="h6">Processing FAQs...</Text>
                  <Text variant="bodyMd" as="p">{progress}%</Text>
                </InlineStack>
                <ProgressBar progress={progress} tone="primary" />
              </BlockStack>
            </Card>
          )}

          {summary && (
            <Banner title="Import Results" tone="info" onDismiss={() => setSummary(null)}>
              <p>
                Successfully added <b>{summary.added}</b> new records. 
                Skipped <b>{summary.skipped}</b> duplicate questions.
              </p>
            </Banner>
          )}

          <Card padding="0">
            <Box padding="400">
              <TextField label="Search FAQs" labelHidden value={searchValue} 
                onChange={(val) => { setSearchValue(val); navigate(`?query=${val}&page=1`); }} 
                placeholder="Search questions..." autoComplete="off" clearButton onClearButtonClick={() => {setSearchValue(""); navigate("?page=1")}}
              />
            </Box>
            
            <ResourceList
              resourceName={{ singular: 'faq', plural: 'faqs' }}
              items={faqs}
              renderItem={(item) => (
                <ResourceItem id={item.id} verticalAlignment="center" onClick={() => {}}>
                  <Box padding="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Box>
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="bold" as="h3">{item.question}</Text>
                          <InlineStack gap="200">
                            {(item.category || "General").split(',')
                              .map(c => c.trim())
                              .filter(c => c !== "")
                              .map((cat, idx) => (
                                <Badge key={`cat-${idx}`} size="small">{cat}</Badge>
                              ))
                            }
                            {item.tag && item.tag.split(',')
                              .map(t => t.trim())
                              .filter(t => t !== "")
                              .map((singleTag, index) => (
                                <Badge key={`tag-${index}`} size="small" tone="info">
                                  {singleTag}
                                </Badge>
                              ))
                            }
                          </InlineStack>
                        </BlockStack>
                      </Box>
                      <InlineStack gap="200">
                        <Button onClick={() => navigate(`/app/faq/${item.id}`)}>Edit</Button>
                        <Button tone="critical" onClick={() => { setFaqToDelete(item.id); setActiveModal(true); }}>Delete</Button>
                      </InlineStack>
                    </InlineStack>
                  </Box>
                </ResourceItem>
              )}
            />

            <Box padding="400">
              <InlineStack align="center">
                <Pagination 
                  hasPrevious={hasPreviousPage} 
                  onPrevious={() => navigate(`?page=${currentPage - 1}&query=${query}`)} 
                  hasNext={hasNextPage} 
                  onNext={() => navigate(`?page=${currentPage + 1}&query=${query}`)} 
                />
              </InlineStack>
            </Box>
          </Card>
        </BlockStack>

        <Modal open={activeModal} onClose={() => setActiveModal(false)} title="Delete FAQ?" 
          primaryAction={{ content: 'Delete', onAction: () => { submit({ id: faqToDelete }, { method: "DELETE" }); setActiveModal(false); }, destructive: true }}
          secondaryActions={[{ content: 'Cancel', onAction: () => setActiveModal(false) }]}
        >
          <Modal.Section><Text as="p">Are you sure you want to delete this FAQ?</Text></Modal.Section>
        </Modal>
        {toastMsg && <Toast content={toastMsg} onDismiss={() => setToastMsg("")} />}
      </Page>
    </Frame>
  );
}