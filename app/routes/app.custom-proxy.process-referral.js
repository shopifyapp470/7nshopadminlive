import { data } from "react-router";
import db from "../db.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return data({ success: false }, { status: 405 });
  }

  try {
    const { newCustomerEmail, newCustomerId, referredByEmail, store } = await request.json();

    if (!newCustomerEmail || !referredByEmail || newCustomerEmail === referredByEmail) {
      console.log("Invalid referral params or self-referral.");
      return data({ success: false, message: "Invalid referral attempt." });
    }

    const result = await db.$transaction(async (tx) => {
      const shopSettings = await tx.userSetting.findUnique({
        where: { shop: store || "7nshop-test.myshopify.com" },
      });
    const pointsToAward = parseFloat(shopSettings?.referralPoint ?? 10);
      console.log(`[CONFIG] Awarding ${pointsToAward} points based on shop settings.`);
      const existingReceiver = await tx.rewardPoint.findFirst({
        where: { customerEmail: newCustomerEmail },
      });
      if (existingReceiver && existingReceiver.referredBy !== null) {
        return { success: false, message: "Referral already processed for this user." };
      }
      if (existingReceiver) {
        await tx.rewardPoint.update({
          where: { id: existingReceiver.id },
          data: { referredBy: referredByEmail }
        });
      } else {
        await tx.rewardPoint.create({
          data: {
            customerId: String(newCustomerId),
            customerEmail: newCustomerEmail,
            store: store || "7nshop-test.myshopify.com",
            pointValue: 0,
            activePoint: 0,
            referralPoint: 0,
            referralCount: 0,
            referredBy: referredByEmail,
            firstOrderDone: false,
          },
        });
      }
      const sender = await tx.rewardPoint.findFirst({
        where: { customerEmail: referredByEmail },
      });

      if (sender) {
        if (sender.referralCount >= 5) {
          return { success: false, message: "Sender limit reached." };
        }
      const incrementVal = parseFloat(pointsToAward);
        const updatedSender = await tx.rewardPoint.update({
          where: { id: sender.id },
          data: {
            pointValue: { increment: incrementVal }, // Database level increment
            activePoint: { increment: incrementVal },
            referralPoint: { increment: Math.floor(incrementVal) },
            referralCount: { increment: 1 }
          },
        });
        console.log(`Sender: ${referredByEmail}\n>>> New Referral Count: ${updatedSender.referralCount}\n>>> New Referral Points: ${updatedSender.referralPoint}`);
        return { success: true };
      } else {
        console.warn(`[NOTICE] Sender ${referredByEmail} not found in database.`);
        return { success: false, message: "Sender not found." };
      }
    });
    return data(result);
    
  } catch (error) {
    console.error(">>> [ERROR] Referral Action Failed:", error.message);
    return data({ success: false, error: error.message }, { status: 500 });
  }
};