import { data } from "react-router";
import db from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");

  if (!customerId) {
    return data({ error: "Missing customer ID" }, { status: 400 });
  }
  try {
    const record = await db.rewardPoint.findUnique({
      where: { customerId: String(customerId) },
      select: {
        referralCount: true,
        referralPoint: true,
      },
    });
    if (!record) {
      return data({ referralCount: 0, referralPoint: 0 });
    }
    return data(record);
  } catch (error) {
    console.error("Failed to fetch referral data:", error);
    return data({ error: "Internal Server Error" }, { status: 500 });
  }
};