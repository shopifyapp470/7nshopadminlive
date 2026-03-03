import { authenticate } from "../shopify.server";
import { data } from "react-router"; 
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  if (!customerId) {
    return data({ success: false, message: "Customer ID Missing" }, { status: 400 });
  }

  try {
    const rewardRecord = await db.rewardPoint.findFirst({
      where: {
        customerId: String(customerId),
        store: session.shop,
      },
    });

    if (rewardRecord) {
      return data({ success: true, pointvalue: rewardRecord.pointvalue });
    } else {
      return data({ success: false, pointvalue: 0 });
    }

  } catch (error) {
    console.error("DB Error:", error);
    return data({ error: "Server Error" }, { status: 500 });
  }
};