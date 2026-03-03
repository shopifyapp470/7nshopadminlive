import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { admin, topic, shop, payload } = await authenticate.webhook(request);

  console.log(`\n🔔 CUSTOMER WEBHOOK RECEIVED | TOPIC: ${topic}`);

  if (topic === "CUSTOMERS_CREATE" || topic === "CUSTOMERS_UPDATE") {
    const customerId = String(payload.id);
    const customerEmail = payload.email || "";
    const fullGid = `gid://shopify/Customer/${customerId}`;
    
    console.log(`👤 [SYNC START] ID: ${customerId} | Email: ${customerEmail}`);

    try {
      // =======================================================
      // 1. METAFIEILDS FETCH (Birthday/Anniversary Logic)
      // =======================================================
      const response = await admin.graphql(
        `#graphql
        query getCustomerMetafields($id: ID!) {
          customer(id: $id) {
            birthday: metafield(namespace: "custom", key: "birthday") { value }
            anniversary: metafield(namespace: "custom", key: "anniversary") { value }
          }
        }`,
        { variables: { id: fullGid } }
      );

      const responseData = await response.json();
      const customerMeta = responseData.data?.customer;
      const birthdayValue = customerMeta?.birthday?.value;
      const anniversaryValue = customerMeta?.anniversary?.value;

      // Dates prepare karein
      const dob = birthdayValue ? new Date(birthdayValue) : null;
      const anniversaryDate = anniversaryValue ? new Date(anniversaryValue) : null;

      if (birthdayValue || anniversaryValue) {
        console.log(` Metafields Found -> BDay: ${birthdayValue}, Anniv: ${anniversaryValue}`);
      }

      await db.rewardPoint.upsert({
        where: { customerId: customerId },
        update: {
          customerEmail: customerEmail,
          dob: dob,
          anniversaryDate: anniversaryDate,
        },
        create: {
          customerId: customerId,
          customerEmail: customerEmail,
          store: shop,
          pointValue: 0,
          activePoint: 0,
          pendingPoint: 0,
          firstOrderDone: false,
          dob: dob,
          anniversaryDate: anniversaryDate,
        },
      });

      console.log(`[DB SYNC DONE] Record successfully synced for: ${customerEmail}`);

    } catch (error) {
      if (error.code === 'P2002') {
        console.log("Duplicate attempt handled by Upsert.");
      } else {
        console.error("[ERROR] Failed to sync customer details:", error.message);
      }
    }
  }
  return new Response();
};