import { useState, useMemo } from "react";
import { useLoaderData, useFetcher } from "react-router"; 
import { Page, Card, DataTable, Text, Box, Frame, BlockStack, Pagination, TextField, Icon, InlineStack, Divider, Badge, Button } from "@shopify/polaris";
import { SearchIcon, RefreshIcon } from "@shopify/polaris-icons"; 
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const digitalLinks = await db.digitalHubLink.findMany({
    where: { shop: session.shop },
    include: { 
      views: {
        orderBy: { updatedAt: "desc" }
      } 
    },
  });
  return { digitalLinks };
};
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = JSON.parse(formData.get("importData"));

  const results = { imported: 0, skipped: 0 };

  for (const item of data) {
    const existing = await db.digitalHubLink.findFirst({
      where: {
        shop: session.shop,
        OR: [
          { name: item.name },
          { url: item.url }
        ]
      }
    });

    if (!existing) {
      await db.digitalHubLink.create({
        data: {
          name: item.name,
          url: item.url,
          shop: session.shop,
        }
      });
      results.imported++;
    } else {
      results.skipped++;
    }
  }

  return { results };
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

  const digitalLinks = fetcher.data?.digitalLinks || initialData.digitalLinks;

  const allData = useMemo(() => {
    return (digitalLinks || []).flatMap((link) => 
      link.views.map((view) => {
        const activeDate = view.updatedAt ? new Date(view.updatedAt) : new Date(view.createdAt);
        
        return {
          id: view.id.substring(view.id.length - 6),
          linkName: view.name || link.name,
          sender: view.senderEmail || "N/A",
          receiver: view.receiverEmail || "Guest",
          count: view.count || 1, 
          rawDate: activeDate,
          date: activeDate.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
        };
      })
    )
    .sort((a, b) => b.rawDate - a.rawDate);
  }, [digitalLinks]);

  const filteredData = useMemo(() => {
    const searchLower = (searchValue || "").toLowerCase();
    return allData.filter((item) => 
      item.linkName.toLowerCase().includes(searchLower) || 
      item.sender.toLowerCase().includes(searchLower) || 
      item.receiver.toLowerCase().includes(searchLower)
    );
  }, [allData, searchValue]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  const currentRows = filteredData.slice(startIndex, startIndex + itemsPerPage).map((item) => [
    <Text fontWeight="bold" as="span" key={`id-${item.id}`}>#{item.id}</Text>,
    <div key={`name-${item.id}`} style={{ minWidth: '150px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
      {item.linkName}
    </div>,
    <div key={`sender-${item.id}`} style={{ minWidth: '150px' }}>
        <Text as="span" tone="subdued">{item.sender}</Text>
    </div>,
    <div key={`receiver-${item.id}`} style={{ minWidth: '150px' }}>
        <Text as="span">{item.receiver}</Text>
    </div>,
    <div key={`count-container-${item.id}`} style={{ textAlign: 'center', width: '100%' }}>
      <Badge tone="info" key={`count-${item.id}`}>{item.count.toString()}</Badge>
    </div>,
    <div key={`date-${item.id}`} style={{ whiteSpace: 'nowrap' }}>{item.date}</div>,
  ]);

  return (
    <Frame>
      <div style={{ backgroundColor: "var(--p-color-bg-surface-secondary)", minHeight: "100vh" }}>
        <Page 
          title="Digital Hub Response" 
          subtitle="Detailed Tracking for Referrals & Views"
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
                <Text variant="headingMd" as="h2">Tracking History</Text>
                <TextField
                  label="Search tracking records"
                  labelHidden
                  value={searchValue}
                  onChange={(v) => {setSearchValue(v); setCurrentPage(1);}}
                  prefix={<Icon source={SearchIcon} />}
                  placeholder="Search by Asset Name..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchValue("")}
                />
              </BlockStack>
            </Box>
            <Divider />
            <Box padding="0">
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                  headings={['ID', 'Asset Name', 'Sender', 'Receiver', 'Count', 'Last Activity']}
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
                            : "No tracking data found"}
                    </Text>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Page>
      </div>
      <style>{`
        /* Table ki default pagination hide karein */
        .Polaris-DataTable__Pagination {
          display: none !important;
        }

        /* Screenshot jaisa box look dene ke liye (optional styling) */
        .Polaris-Pagination {
          background: #f1f1f1;
          border-radius: 8px;
          padding: 2px;
        }
      `}</style>
    </Frame>
  );
}