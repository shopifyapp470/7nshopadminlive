import { useState, useMemo } from "react";
import { useLoaderData, useFetcher } from "react-router"; 
import { Page, Card, DataTable, Text, Box, Frame, BlockStack, Pagination, TextField, Icon, InlineStack, Divider, Badge, Button } from "@shopify/polaris";
import { SearchIcon, RefreshIcon } from "@shopify/polaris-icons"; 
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const logs = await db.downloadLog.findMany({
    orderBy: { lastDownloaded: "desc" },
  });
  
  return { logs };
};

export default function DigitalHubResponse() {
  const initialData = useLoaderData();
  const fetcher = useFetcher();
  
  const [searchValue, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const refreshData = () => {
    fetcher.load(window.location.pathname);
  };

  const logs = fetcher.data?.logs || initialData.logs || [];

  const processedData = useMemo(() => {
    return logs.map((log) => ({
      id: log.id.substring(log.id.length - 6),
      assetName: log.assetName,
      employee: log.employeeEmail,
      count: log.downloadCount,
      rawDate: new Date(log.lastDownloaded),
      dateText: new Date(log.lastDownloaded).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
    }));
  }, [logs]);

  const filteredData = useMemo(() => {
    const searchLower = (searchValue || "").toLowerCase();
    return processedData.filter((item) => 
      item.assetName.toLowerCase().includes(searchLower) || 
      item.employee.toLowerCase().includes(searchLower)
    );
  }, [processedData, searchValue]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  const currentRows = filteredData.slice(startIndex, startIndex + itemsPerPage).map((item) => [
    <Text fontWeight="bold" as="span" key={`id-${item.id}`}>#{item.id}</Text>,
    <div key={`name-${item.id}`} style={{ minWidth: '200px', whiteSpace: 'normal' }}>
      <Text variant="bodyMd" fontWeight="medium">{item.assetName}</Text>
    </div>,
    <Text as="span" tone="subdued" key={`emp-${item.id}`}>{item.employee}</Text>,
    <div key={`count-${item.id}`} style={{ textAlign: 'center' }}>
      <Badge tone="info">{item.count.toString()}</Badge>
    </div>,
    <div key={`date-${item.id}`} style={{ whiteSpace: 'nowrap' }}>
      <Text variant="bodySm">{item.dateText}</Text>
    </div>,
  ]);

  return (
    <Frame>
      <div style={{ backgroundColor: "var(--p-color-bg-surface-secondary)", minHeight: "100vh" }}>
        <Page 
          title="Download History1234" 
          subtitle="Real-time tracking of asset downloads"
          fullWidth
          primaryAction={
            <Button 
              icon={RefreshIcon} 
              onClick={refreshData} 
              loading={fetcher.state === "loading"}
            >
              Refresh Data
            </Button>
          }
        >
          <Card padding="0">
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Activity Log</Text>
                <TextField
                  label="Search logs"
                  labelHidden
                  value={searchValue}
                  onChange={(v) => {setSearchValue(v); setCurrentPage(1);}}
                  prefix={<Icon source={SearchIcon} />}
                  placeholder="Search by Asset Name or Employee Email..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchValue("")}
                />
              </BlockStack>
            </Box>
            
            <Divider />
            
            <Box padding="0">
              <div style={{ overflowX: 'auto' }}>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                  headings={['ID', 'Asset Name', 'Employee Email', 'Downloads', 'Last Activity']}
                  rows={currentRows}
                  hasZebraStripingOnData
                  increasedTableDensity
                  verticalAlign="middle"
                />
              </div>
            </Box>

            <Divider />
            
            <Box padding="400">
              <BlockStack align="center" gap="200">
                <InlineStack align="center">
                    <Pagination
                      label={`Page ${currentPage} of ${Math.max(totalPages, 1)}`}
                      hasPrevious={currentPage > 1}
                      onPrevious={() => setCurrentPage((p) => p - 1)}
                      hasNext={currentPage < totalPages}
                      onNext={() => setCurrentPage((p) => p + 1)}
                    />
                </InlineStack>
                <Box textAlign="center">
                    <Text tone="subdued">
                        {filteredData.length > 0 
                            ? `Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filteredData.length)} of ${filteredData.length} records`
                            : "No logs found"}
                    </Text>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Page>
      </div>
      
      <style>{`
        .Polaris-DataTable__Pagination { display: none !important; }
        .Polaris-Pagination { background: #f4f4f4; border-radius: 8px; border: 1px solid #dfe3e8; }
      `}</style>
    </Frame>
  );
}