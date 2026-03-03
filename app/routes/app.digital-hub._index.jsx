import { useState, useRef, useEffect } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import * as XLSX from "xlsx";
import { 
  Page, Card, ResourceList, ResourceItem, Text, Badge, Button, InlineStack, 
  Pagination, Modal, Frame, Box, Toast, TextField, BlockStack, ProgressBar, Banner, Divider
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("query") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10; 
  
  const totalCount = await db.digitalHubLink.count({
    where: { shop: session.shop, name: { contains: query, mode: 'insensitive' } }
  });

  const links = await db.digitalHubLink.findMany({
    where: { shop: session.shop, name: { contains: query, mode: 'insensitive' } },
    orderBy: { dateAdded: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const allExistingLinks = await db.digitalHubLink.findMany({
    where: { shop: session.shop },
    select: { name: true, url: true }
  });

  return { 
    links, 
    query, 
    currentPage: page, 
    totalPages: Math.ceil(totalCount / pageSize), 
    hasNextPage: page < Math.ceil(totalCount / pageSize), 
    hasPreviousPage: page > 1,
    existingLinkList: allExistingLinks.map(l => `${l.name.toLowerCase()}|${l.url.toLowerCase()}`)
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const _action = formData.get("_action");

  if (request.method === "DELETE") {
    const id = formData.get("id");
    try {
      await db.digitalHubLink.delete({ where: { id: id, shop: session.shop } });
      return { success: true, message: "Link deleted successfully" };
    } catch (error) {
      return { success: false, error: "Record not found" };
    }
  }

  if (_action === "IMPORT_BATCH") {
    const data = JSON.parse(formData.get("data"));
    const dataWithShop = data.map(item => ({ 
      ...item, 
      shop: session.shop,
      dateAdded: new Date() 
    }));
    await db.digitalHubLink.createMany({ data: dataWithShop });
    return { success: true };
  }

  if (_action === "EXPORT_DATA") {
    const allLinks = await db.digitalHubLink.findMany({ where: { shop: session.shop } });
    const exportData = allLinks.map(l => ({ name: l.name, url: l.url, category: l.category, tag: l.tag }));
    return { success: true, exportData, fileName: `DigitalHub_Export.csv` };
  }
  return { success: false };
};

export default function DigitalHubIndex() {
  const { links, query, currentPage, totalPages, hasNextPage, hasPreviousPage, existingLinkList } = useLoaderData();
  const navigate = useNavigate();
  
  const deleteFetcher = useFetcher();
  const exportFetcher = useFetcher();
  const fileInputRef = useRef(null);

  const [searchValue, setSearchValue] = useState(query);
  const [activeModal, setActiveModal] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (deleteFetcher.data?.success) setToastMsg(deleteFetcher.data.message);
    
    if (exportFetcher.data?.exportData) {
      const worksheet = XLSX.utils.json_to_sheet(exportFetcher.data.exportData);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFetcher.data.fileName;
      link.click();
    }
  }, [deleteFetcher.data, exportFetcher.data]);

  const handleDelete = () => {
    deleteFetcher.submit({ id: linkToDelete }, { method: "DELETE" });
    setActiveModal(false);
  };

  const handleExport = () => {
    exportFetcher.submit({ _action: "EXPORT_DATA" }, { method: "POST" });
  };

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
      const existingSet = new Set(existingLinkList);
      let validData = [];
      let duplicateCount = 0;
      const clean = (val) => val ? String(val).trim().replace(/^"|"$/g, '').trim() : "";

      rawData.forEach(row => {
        const name = clean(row.name || row.Name);
        const url = clean(row.url || row.URL);
        if (!name || !url) return;
        const combinedKey = `${name.toLowerCase()}|${url.toLowerCase()}`;
        if (existingSet.has(combinedKey)) {
          duplicateCount++;
        } else {
          const isDownloadEnabled = clean(row.enableDownload || row.Download).toUpperCase() === "TRUE";
          validData.push({
            name, url,
            description: clean(row.description || row.Description),
            download: isDownloadEnabled,
            downloadUrl: isDownloadEnabled ? clean(row.downloadUrl || row.DownloadUrl) : "",
            category: clean(row.category || row.Category),
            tag: clean(row.tag || row.Tag),
          });
          existingSet.add(combinedKey);
        }
      });

      if (validData.length === 0) {
        setSummary({ added: 0, skipped: duplicateCount });
        setIsImporting(false);
        return;
      }

      const BATCH_SIZE = 10;
      for (let i = 0; i < validData.length; i += BATCH_SIZE) {
        const batch = validData.slice(i, i + BATCH_SIZE);
        const formData = new FormData();
        formData.append("_action", "IMPORT_BATCH");
        formData.append("data", JSON.stringify(batch));
        await fetch(window.location.pathname + window.location.search, { method: "POST", body: formData });
        const currentProgress = Math.min(Math.round(((i + BATCH_SIZE) / validData.length) * 100), 100);
        setProgress(currentProgress);
      }
      setSummary({ added: validData.length, skipped: duplicateCount });
      setIsImporting(false);
      navigate(".", { replace: true, preventScrollReset: true });
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ""; 
  };

  return (
    <Frame>
      <Page 
        title="Digital Hub" 
        fullWidth
        primaryAction={{ content: 'Add Link', onAction: () => navigate("/app/digital-hub/new") }}
        secondaryActions={[
          { content: 'Bulk Upload', onAction: () => fileInputRef.current?.click(), disabled: isImporting },
          { content: 'Export', onAction: handleExport, loading: exportFetcher.state === "submitting" }
        ]}
      >
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
        
        <BlockStack gap="400">
          {isImporting && (
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text variant="headingSm" as="h6">Importing Links...</Text>
                  <Text variant="bodyMd" as="p">{progress}%</Text>
                </InlineStack>
                <ProgressBar progress={progress} tone="primary" />
              </BlockStack>
            </Card>
          )}
          
          {summary && (
            <Banner title="Import Summary" tone="info" onDismiss={() => setSummary(null)}>
              <p>Successfully imported <b>{summary.added}</b> links. Skipped <b>{summary.skipped}</b> duplicates.</p>
            </Banner>
          )}

          <Card padding="0">
            <Box padding="400">
              <TextField 
                label="Search Links" 
                labelHidden 
                value={searchValue} 
                onChange={(val) => { 
                  setSearchValue(val); 
                  navigate(`?query=${val}&page=1`, { replace: true, preventScrollReset: true }); 
                }} 
                placeholder="Search by name..." 
                autoComplete="off" 
                clearButton 
                onClearButtonClick={() => {setSearchValue(""); navigate("?page=1", { replace: true })}}
              />
            </Box>
            
            <ResourceList
              resourceName={{ singular: 'link', plural: 'links' }}
              items={links}
              loading={deleteFetcher.state === "submitting"}
              renderItem={(item) => (
                <ResourceItem id={item.id} verticalAlignment="center" onClick={() => {}}>
                  <Box padding="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="200">
                        <Text variant="bodyMd" fontWeight="bold" as="h3">{item.name}</Text>
                        <InlineStack gap="150" blockAlign="center">
                          {item.category?.split(',').filter(Boolean).map((cat, idx) => (
                            <Badge key={idx} size="small">{cat.trim()}</Badge>
                          ))}
                          {item.tag?.split(',').filter(Boolean).map((tag, idx) => (
                            <Badge key={idx} size="small" tone="info">{tag.trim()}</Badge>
                          ))}
                        </InlineStack>
                      </BlockStack>
                      <InlineStack gap="200">
                        <Button onClick={() => navigate(`/app/digital-hub/${item.id}`)}>Edit</Button>
                        <Button tone="critical" onClick={() => { setLinkToDelete(item.id); setActiveModal(true); }}>Delete</Button>
                      </InlineStack>
                    </InlineStack>
                  </Box>
                </ResourceItem>
              )}
            />

            <Divider />
            <Box padding="400">
              <InlineStack align="center">
                <Pagination
                  label={`Page ${currentPage} of ${Math.max(totalPages, 1)}`}
                  hasPrevious={hasPreviousPage}
                  onPrevious={() => {
                    navigate(`?page=${currentPage - 1}&query=${searchValue}`, { replace: true, preventScrollReset: true });
                  }}
                  hasNext={hasNextPage}
                  onNext={() => {
                    navigate(`?page=${currentPage + 1}&query=${searchValue}`, { replace: true, preventScrollReset: true });
                  }}
                />
              </InlineStack>
            </Box>
          </Card>
        </BlockStack>
        
        <Modal open={activeModal} onClose={() => setActiveModal(false)} title="Delete Link?" 
          primaryAction={{ content: 'Delete', onAction: handleDelete, destructive: true, loading: deleteFetcher.state === "submitting" }}
          secondaryActions={[{ content: 'Cancel', onAction: () => setActiveModal(false) }]}
        >
          <Modal.Section><Text as="p">Are you sure you want to delete this link?</Text></Modal.Section>
        </Modal>

        {toastMsg && <Toast content={toastMsg} onDismiss={() => setToastMsg("")} />}
      </Page>
    </Frame>
  );
}