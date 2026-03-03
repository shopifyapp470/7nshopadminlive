import { useState, useMemo, useEffect } from "react";
import { useLoaderData, useRevalidator } from "react-router"; 
import { 
  Page, DataTable, Text, Box, Frame, BlockStack, 
  Pagination, TextField, Icon, InlineStack, Divider, Badge, Card, Button 
} from "@shopify/polaris";
import { SearchIcon, RefreshIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const surveys = await db.survey.findMany({
    where: { shop: session.shop },
    include: { responses: { orderBy: { updatedAt: "desc" } } },
  });
  return { surveys };
};

export default function SurveyAnalytics() {
  const { surveys } = useLoaderData(); 
  const revalidator = useRevalidator(); 
  
  const [searchValue, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const handleSync = () => {
      if (revalidator.state === "idle") {
        revalidator.revalidate();
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleSync();
      }
    };
    window.addEventListener("focus", handleSync);
    window.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [revalidator]);

const allData = useMemo(() => {
  return (surveys || []).flatMap((survey) => 
    survey.responses.map((resp) => {
      const displayDate = (resp.count > 1 && resp.updatedAt) ? resp.updatedAt : resp.createdAt;
      return {
        id: resp.id.substring(resp.id.length - 6),
        title: resp.title || survey.title,
        senderEmail: resp.senderEmail || "N/A",
        receiverEmail: resp.receiverEmail || "Guest",
        count: resp.count || 1,
        date: new Date(displayDate).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true,
        }).toUpperCase(), 
      };
    })
  );
}, [surveys]);

  const filteredData = useMemo(() => {
    const searchLower = (searchValue || "").toLowerCase();
    return allData.filter((item) => 
      item.title.toLowerCase().includes(searchLower) || 
      item.senderEmail.toLowerCase().includes(searchLower) ||
      item.receiverEmail.toLowerCase().includes(searchLower)
    );
  }, [allData, searchValue]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const selectedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  
  const currentRows = selectedData.map((item) => [
    <Text fontWeight="bold" as="span" key={`id-${item.id}`}>#{item.id}</Text>,
    <div key={`title-${item.id}`} style={{ minWidth: '150px' }}><Text as="span">{item.title}</Text></div>,
    <div key={`sender-${item.id}`} style={{ minWidth: '150px' }}><Text as="span" tone="subdued">{item.senderEmail}</Text></div>,
    <div key={`receiver-${item.id}`} style={{ minWidth: '150px' }}><Text as="span">{item.receiverEmail}</Text></div>,
    <div key={`count-${item.id}`} style={{ textAlign: 'center' }}><Badge tone="info">{item.count}</Badge></div>,
    <div key={`date-${item.id}`} style={{ whiteSpace: 'nowrap' }}><Text as="span" tone="subdued">{item.date}</Text></div>,
  ]);

  return (
    <Frame>
      <Page 
        title="Survey Analytics" 
        fullWidth
        primaryAction={
          <Button 
            icon={RefreshIcon} 
            onClick={() => revalidator.revalidate()} 
            loading={revalidator.state === "loading"}
          >
            Sync Now
          </Button>
        }
      >
        <Card padding="0">
          <Box padding="400">
            <TextField
              label="Search submissions"
              labelHidden
              value={searchValue}
              onChange={(v) => {setSearchValue(v); setCurrentPage(1);}}
              prefix={<Icon source={SearchIcon} />}
              placeholder="Search by Title, Sender, or Receiver..."
              autoComplete="off"
              clearButton
              onClearButtonClick={() => setSearchValue("")}
            />
          </Box>
          <Divider />
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
            headings={['ID', 'Survey Title', 'Sender', 'Receiver', 'Count', 'Date & Time (IST)']}
            rows={currentRows}
            hasZebraStripingOnData
            increasedTableDensity
            verticalAlign="middle"
          />
          <Divider />
          <Box padding="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text tone="subdued">
                {`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filteredData.length)} of ${filteredData.length}`}
              </Text>
              {totalPages > 1 && (
                <Pagination
                  hasPrevious={currentPage > 1}
                  onPrevious={() => setCurrentPage((p) => p - 1)}
                  hasNext={currentPage < totalPages}
                  onNext={() => setCurrentPage((p) => p + 1)}
                />
              )}
            </InlineStack>
          </Box>
        </Card>
      </Page>
    </Frame>
  );
}