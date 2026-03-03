import { authenticate, unauthenticated } from "../shopify.server";
import { data } from "react-router"; 
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return data({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const verifiedCustomerId = url.searchParams.get("logged_in_customer_id");

  switch (type) {
    case "digital_hub": {
      const links = await db.digitalHubLink.findMany({
        where: { shop: session.shop },
        orderBy: { dateAdded: "desc" },
      });
      return data({ success: true, links });
    }
    case "faq": {
      try {
        const faqs = await db.fAQ.findMany({ 
          where: { shop: session.shop },
          orderBy: { displayDate: "desc" },
        });
        return data({ success: true, links: faqs });
      } catch (error) {
        console.error(" FAQ Fetch Error:", error);
        return data({ success: false, message: "Database Error" }, { status: 500 });
      }
    }
    case "surveys": {
      const surveys = await db.survey.findMany({
        where: { shop: session.shop },
        orderBy: { createdAt: "desc" },
      });
      return data({ success: true, surveys });
    }
    default: {
      if (!verifiedCustomerId) {
        return data({ success: false, message: "Customer not logged in" }, { status: 400 });
      }
      try {
        const rewardRecord = await db.rewardPoint.findFirst({
          where: { customerId: String(verifiedCustomerId) },
        });
        return data({
          success: true,
          pointValue: rewardRecord ? rewardRecord.pointValue : 0,
          verifiedId: verifiedCustomerId,
        });
      } catch (error) {
        console.error(" Reward Loader Error:", error);
        return data({ success: false, message: "Server Error" }, { status: 500 });
      }
    }
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  
  if (!session) return data({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const verifiedCustomerId = url.searchParams.get("logged_in_customer_id");

  if (!verifiedCustomerId) {
    return data({ error: "Customer session expired. Please login again." }, { status: 403 });
  }
  try {
    const { userValue } = await request.json();
    const shop = session.shop;
    const rewardRecord = await db.rewardPoint.findFirst({
      where: { customerId: String(verifiedCustomerId), store: shop }
    });

    if (!rewardRecord || rewardRecord.pointValue < parseFloat(userValue)) {
      return data({ message: "Aapke paas paryapt points nahi hain." }, { status: 400 });
    }

    const formattedAmount = parseFloat(userValue).toFixed(2);
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const discountTitle = `REWARD-${verifiedCustomerId}-${Math.floor(userValue)}-${uniqueSuffix}`; 
    const { admin } = await unauthenticated.admin(shop);
    
    const response = await admin.graphql(
      `#graphql
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode { codeDiscount { ... on DiscountCodeBasic { title } } }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          basicCodeDiscount: {
            title: discountTitle,
            code: discountTitle,
            startsAt: new Date().toISOString(),
            customerSelection: { 
                customers: { add: [`gid://shopify/Customer/${verifiedCustomerId}`] } 
            },
            customerGets: {
              value: { discountAmount: { amount: formattedAmount, appliesOnEachItem: false } },
              items: { all: true }
            },
            appliesOncePerCustomer: true,
            usageLimit: 1
          }
        }
      }
    );

    const responseJson = await response.json();
    const errors = responseJson.data?.discountCodeBasicCreate?.userErrors;

    if (errors && errors.length > 0) {
        return data({ success: false, message: errors[0].message }, { status: 400 });
    }
    return data({ 
        success: true, 
        discountTitle: discountTitle,
        ownerId: verifiedCustomerId 
    });

  } catch (error) {
    console.error("Action Error:", error);
    return data({ error: "Server Error" }, { status: 500 });
  }
};

