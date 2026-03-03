import { data } from "react-router"; 
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  const shop = url.searchParams.get("shop");

  if (!customerId || !shop) {
    return data({ points: 0, error: "Missing customerId or shop" }, { status: 400 });
  }

  try {
    const rewardRecord = await prisma.rewardPoint.findFirst({
      where: {
        customerId: customerId, 
        store: shop
      },
      select: {
        pointValue: true
      }
    });
    return data({ 
      points: rewardRecord ? rewardRecord.pointValue : 0 
    });
    
  } catch (error) {
    console.error("Prisma Error Details:", error);
    return data({ points: 0, error: "Database connection failed" }, { status: 500 });
  }
};