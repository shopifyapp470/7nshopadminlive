import { data } from "react-router"; 
import db from "../db.server";
import { updateCleverTapWallet, sendCleverTapEvent } from "../utlis/clevertap.server";

export const loader = async ({ request }) => {
  console.log(" [DAILY CRON START] Checking Birthdays & Anniversaries...");
  
  try {
    const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));   
    const currentMonth = today.getMonth() + 1; 
    const currentDay = today.getDate();        
    const currentYear = today.getFullYear();   
    
    console.log(` Today's IST Date: ${currentDay}/${currentMonth}/${currentYear}`);

    const allUsers = await db.rewardPoint.findMany({
      where: {
        OR: [ 
          { dob: { not: null } }, 
          { anniversaryDate: { not: null } } 
        ]
      }
    });

    if (allUsers.length === 0) {
      console.log(" No users found with Birthday/Anniversary dates.");
      return data({ status: "No users with dates found" });
    }

    console.log(` Found ${allUsers.length} users in DB with potential events.`);
    let processedCount = 0;

    for (const user of allUsers) {
      try {
        const shop = user.store;
        const identity = user.customerEmail || user.customerId;
        
        const settings = await db.userSetting.findUnique({ where: { shop: shop } });
        if (!settings) continue;

        let totalPointsToAdd = 0;
        let dbUpdateData = {}; 
        let rewardMessages = []; 

        if (user.dob && settings.birthdayPoint > 0) {
          const dob = new Date(user.dob);
          const isBirthday = (dob.getUTCMonth() + 1 === currentMonth) && (dob.getUTCDate() === currentDay);
          const notRewardedYet = user.lastBirthdayRewardYear !== currentYear;

          if (isBirthday && notRewardedYet) {
            console.log(` Birthday Match: ${identity}`);
            totalPointsToAdd += settings.birthdayPoint;
            dbUpdateData.lastBirthdayRewardYear = currentYear;
            rewardMessages.push("Birthday");
            
            await sendCleverTapEvent(identity, "User Birthday", {
                "Points_Gifted": settings.birthdayPoint,
                "Date": today.toISOString().split('T')[0]
            }, shop).catch(e => console.error("Event Error:", e.message));
          }
        }

        if (user.anniversaryDate && settings.anniversaryPoint > 0) {
          const anniv = new Date(user.anniversaryDate);
          const isAnniversary = (anniv.getUTCMonth() + 1 === currentMonth) && (anniv.getUTCDate() === currentDay);
          const notRewardedYet = user.lastAnniversaryRewardYear !== currentYear;

          if (isAnniversary && notRewardedYet) {
            console.log(` Anniversary Match: ${identity}`);
            totalPointsToAdd += settings.anniversaryPoint;
            dbUpdateData.lastAnniversaryRewardYear = currentYear;
            rewardMessages.push("Anniversary");
            
            await sendCleverTapEvent(identity, "User Anniversary", {
                "Points_Gifted": settings.anniversaryPoint,
                "Date": today.toISOString().split('T')[0]
            }, shop).catch(e => console.error("Event Error:", e.message));
          }
        }

        if (totalPointsToAdd > 0) {
          await db.rewardPoint.update({
            where: { id: user.id },
            data: { 
              activePoint: { increment: totalPointsToAdd },
              pointValue: { increment: totalPointsToAdd },
              birthdayPoint: { increment: dbUpdateData.lastBirthdayRewardYear ? settings.birthdayPoint : 0 },
              anniversaryPoint: { increment: dbUpdateData.lastAnniversaryRewardYear ? settings.anniversaryPoint : 0 },
              ...dbUpdateData 
            }
          });

          const transactionId = `GIFT-${currentYear}-${currentMonth}-${currentDay}-${user.customerId}`; 
          const reasonString = rewardMessages.join(" and "); 
          console.log(` Crediting Wallet: ${identity} | Points: ${totalPointsToAdd}`);
          
          await updateCleverTapWallet(
            identity, 
            totalPointsToAdd, 
            "CREDIT", 
            transactionId, 
            0, 
            `Reward for ${reasonString}`, 
            shop, 
            "ACTIVE"
          );

          processedCount++;
        }
      } catch (userErr) {
        console.error(` Error processing user ${user.customerId}:`, userErr.message);
      }
    }

    console.log(` [CRON FINISHED] Processed ${processedCount} users.`);
    return data({ status: "Success", processed_users: processedCount });

  } catch (error) {
    console.error(" [CRON FATAL ERROR]", error);
    return data({ status: "Error", message: error.message }, { status: 500 });
  }
};