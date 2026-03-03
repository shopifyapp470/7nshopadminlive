import { authenticate } from "../shopify.server";
import { data } from "react-router"; 
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return data({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id") || url.searchParams.get("customerId");
  const shop = session.shop;

  if (!customerId) {
    return data({ success: false, message: "Customer ID missing" }, { status: 400 });
  }
  try {
    const customerRewardData = await db.rewardPoint.findFirst({
      where: {
        customerId: String(customerId),
        store: shop,
      },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    const shopSettings = await db.userSetting.findUnique({
      where: {
        shop: shop,
      },
    });
    const responsePayload = {
      success: true,
      totalPoints: customerRewardData ? customerRewardData.activePoint : 0,
      orders: customerRewardData ? customerRewardData.orders : [],
      birthdayPoint: shopSettings ? shopSettings.birthdayPoint : 0,
      anniversaryPoint: shopSettings ? shopSettings.anniversaryPoint : 0,
      lastBirthdayRewardYear: customerRewardData ? customerRewardData.lastBirthdayRewardYear : null,
      lastAnniversaryRewardYear: customerRewardData ? customerRewardData.lastAnniversaryRewardYear : null
    };
    return data(responsePayload, { status: 200 });
  } catch (error) {
    console.error("Birthday Proxy Error:", error);
    return data({ success: false, message: "Server Error" }, { status: 500 });
  }
};