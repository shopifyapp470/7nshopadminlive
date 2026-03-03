import { useState, useMemo, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router"; 
import { 
  Page, DataTable, Text, Box, Frame, BlockStack, 
  Pagination, TextField, Icon, InlineStack, Divider, Badge, Card, Button
} from "@shopify/polaris";
import { SearchIcon, RefreshIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const allReferrals = await db.rewardPoint.findMany({
    where: { store: session.shop, referredBy: { not: null } },
    select: { customerEmail: true, referredBy: true }
  });

  const referrersProfile = await db.rewardPoint.findMany({
    where: { store: session.shop, referralCount: { gt: 0 } }
  });

  return { allReferrals, referrersProfile };
};

export default function ReferralAnalytics() {
  const initialData = useLoaderData();
  const fetcher = useFetcher();
  const [searchValue, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { allReferrals, referrersProfile } = fetcher.data || initialData;

  const refreshData = () => {
    fetcher.load(window.location.pathname);
  };

  const groupedData = useMemo(() => {
    return (referrersProfile || []).map((referrer) => {
      const currentReferrerEmail = (referrer.customerEmail || referrer.customeremail || "").toLowerCase();
      const invitedEmails = (allReferrals || [])
        .filter(ref => (ref.referredBy || "").toLowerCase() === currentReferrerEmail)
        .map(ref => ref.customerEmail || ref.customeremail || "Unknown")
        .join(", ");

      return {
        id: referrer.id ? referrer.id.substring(referrer.id.length - 6) : "N/A",
        referrerEmail: referrer.customerEmail || referrer.customeremail || "N/A",
        invitedUsers: invitedEmails || "No emails found",
        points: referrer.referralPoint || 0,
        count: referrer.referralCount || 0,
      };
    });
  }, [allReferrals, referrersProfile]);

  const filteredData = useMemo(() => {
    const searchLower = (searchValue || "").toLowerCase();
    return groupedData.filter(item => 
      item.referrerEmail.toLowerCase().includes(searchLower) || 
      item.invitedUsers.toLowerCase().includes(searchLower)
    );
  }, [groupedData, searchValue]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const selectedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  
  const currentRows = selectedData.map((item) => [
    <Text variant="bodyMd" fontWeight="bold" tone="subdued" key={`id-${item.id}`}>#{item.id}</Text>,
    <Box paddingBlock="200" key={`ref-${item.id}`}><Text variant="bodyMd">{item.referrerEmail}</Text></Box>,
    <Box paddingBlock="200" maxWidth="350px" key={`invited-${item.id}`}>
      <Text variant="bodyMd" tone="subdued" breakWord>{item.invitedUsers}</Text>
    </Box>,
    <div style={{ display: 'flex', justifyContent: 'center' }} key={`count-${item.id}`}>
        <Badge tone="info" size="small">{item.count}</Badge>
    </div>,
    <div style={{ display: 'flex', justifyContent: 'center' }} key={`points-${item.id}`}>
        <Badge tone="success" size="small">{item.points} Pts</Badge>
    </div>
  ]);

  return (
    <Frame>
      <Page 
        title="Referral Analytics" 
        subtitle="View all invited friends per referrer" 
        fullWidth
        primaryAction={
          <Button icon={RefreshIcon} onClick={refreshData} loading={fetcher.state === "loading"}>
            Refresh Data
          </Button>
        }
      >
        <Card padding="0">
          <Box padding="400">
            <TextField
              label="Search referrals"
              labelHidden
              value={searchValue}
              onChange={(v) => {setSearchValue(v); setCurrentPage(1);}}
              prefix={<Icon source={SearchIcon} />}
              placeholder="Search by Referrer or Invited Email..."
              autoComplete="off"
              clearButton
              onClearButtonClick={() => setSearchValue("")}
            />
          </Box>
          
          <Divider />

          <Box padding="0">
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'numeric', 'numeric']}
              headings={[
                'ID', 
                'Referrer (Sender)', 
                'Invited Friends (Receiver)', 
                <div style={{ textAlign: 'center' }}>Count</div>, 
                <div style={{ textAlign: 'center' }}>Points</div>
              ]}
              rows={currentRows}
              footerContent={filteredData.length === 0 ? "No records found" : undefined}
              increasedTableDensity
              hasZebraStripingOnData
              verticalAlign="middle"
            />
          </Box>

          <Divider />

          <Box padding="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text tone="subdued">
                Showing {filteredData.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} records
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