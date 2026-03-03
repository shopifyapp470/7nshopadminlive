import { data } from "react-router"; 
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { liquid } = await authenticate.public.appProxy(request);

  if (!liquid) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");
  const shop = url.searchParams.get("shop");

  if (!customerId) {
    return data({ error: "Customer not found" }, { status: 404 });
  }

  const rewardData = await prisma.rewardPoint.findFirst({
    where: {
      customerId: customerId,
      store: shop,
    },
    include: {
      orders: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!rewardData) {
    return data({ orders: [], totalPoints: 0, birthdayPoint: 0, 
      anniversaryPoint: 0, pendingPoints: 0 });
  }
  return data({
    orders: rewardData.orders || [],
    totalPoints: rewardData.pointValue, 
    birthdayPoint: rewardData.birthdayPoint || 0,
    anniversaryPoint: rewardData.anniversaryPoint || 0,
    pendingPoints: rewardData.pendingPoint || 0
  });
};