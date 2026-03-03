import { data } from "react-router";
import db from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const customerId = url.searchParams.get("logged_in_customer_id");

  if (!shop || !customerId) {
    return data({ status: "error", message: "Missing params" }, { status: 400 });
  }

  try {
    const config = await db.cleverTapConfig.findUnique({ where: { shop: shop } });
    const rewardUser = await db.rewardPoint.findFirst({ 
      where: { customerId: String(customerId), store: shop } 
    });

    if (!config || !rewardUser) {
      return data({ status: "fail", message: "User/Config not found" });
    }
    // ---  lifetimeSavings aggregation code  ---
    const savingsAggregation = await db.orderHistory.aggregate({
      where: {
        rewardPoint: { 
          customerId: String(customerId)
        },
        pointsRedeemed: { gt: 0 }
      },
      _sum: {
        pointsRedeemed: true
      }
    });

    const lifetimeSavings = savingsAggregation._sum.pointsRedeemed || 0;
    // ------------------------------------------//

    const identity = rewardUser.customerEmail || rewardUser.customerId;
    const ctUrl = `https://${config.region}.api.clevertap.com/1/promo/transactions?identity=${encodeURIComponent(identity)}&walletId=${config.walletId}`;
    
    const response = await fetch(ctUrl, {
      method: "GET",
      headers: {
        "X-CleverTap-Account-Id": config.accountId,
        "X-CleverTap-Passcode": config.passcode,
        "Content-Type": "application/json"
      }
    });

    const ctData = await response.json();

    if (ctData.status === "success" && ctData.record) {
      const promisedPoints = ctData.record.promisedPoints?.totalPromisedPoints || 0;
      const transactions = ctData.record.allTransactions || [];
      let newBalance = 0;

      const formattedOrders = transactions.map(trans => {
        const points = parseFloat(trans.points) || 0;
        if (trans.type === "CREDIT") newBalance += points;
        else if (trans.type === "DEBIT") newBalance -= points;
          let finalDescription = trans.description.replace(/##/g, '#');
          if (trans.txnSource === "CAMPAIGN" && trans.orderId) {
            const cleanId = trans.orderId.startsWith('#') ? trans.orderId : `#${trans.orderId}`;
            finalDescription = `points earned for ${cleanId}`; 
          } 
          else {
              finalDescription = finalDescription.replace(/Points earned from campaign\s*\d+/gi, "points earned");
          }
          let currentStatus = "PROCESSED";
        if (trans.type === "PROMISED" || trans.type === "PENDING") {
          currentStatus = "PENDING";
        } else if (trans.description.toLowerCase().includes("cancelled")) {
          currentStatus = "CANCELLED";
        }
        return {
          createdAt: trans.txnTimestamp * 1000,
          points: points,
          type: currentStatus === "PENDING" ? "pending" : (trans.type === "CREDIT" ? "earned" : "redeemed"),
          description: finalDescription,
          status: currentStatus
        };
      });

        const updatedUser = await db.rewardPoint.update({
          where: { id: rewardUser.id },
          data: {
            activePoint: parseFloat(newBalance.toFixed(2)),
            pointValue: parseFloat(newBalance.toFixed(2))
          }
        });

        return data({ 
            status: "success", 
            orders: formattedOrders,
            totalPoints: updatedUser.activePoint,
            promisedPoints: promisedPoints,
            lifetimeSavings: lifetimeSavings,
          }); 
    }

    return data({ status: "fail", message: "Invalid API Response" });
  } catch (error) {
    console.error("Proxy Error:", error);
    return data({ status: "error", message: error.message }, { status: 500 });
  }
};


// import { data } from "react-router"; 
// import db from "../db.server";

// export const loader = async ({ request }) => {
//   const url = new URL(request.url);
//   const shop = url.searchParams.get("shop");
//   const customerId = url.searchParams.get("logged_in_customer_id");

//   if (!shop || !customerId) {
//     return data({ status: "error", message: "Missing params" }, { status: 400 });
//   }

//   try {
//     const config = await db.cleverTapConfig.findUnique({ where: { shop: shop } });
//     const rewardUser = await db.rewardPoint.findFirst({ 
//       where: { customerId: String(customerId), store: shop } 
//     });

//     if (!config || !rewardUser) {
//       return data({ status: "fail", message: "User/Config not found" });
//     }

//     const identity = rewardUser.customerEmail || rewardUser.customerId;
//     const ctUrl = `https://${config.region}.api.clevertap.com/1/promo/transactions?identity=${encodeURIComponent(identity)}&walletId=${config.walletId}`;
    
//     const response = await fetch(ctUrl, {
//       method: "GET",
//       headers: {
//         "X-CleverTap-Account-Id": config.accountId,
//         "X-CleverTap-Passcode": config.passcode,
//         "Content-Type": "application/json"
//       }
//     });

//     const ctData = await response.json();

//     if (ctData.status === "success" && ctData.record) {
//       const transactions = ctData.record.allTransactions || [];
      
//       // Dynamic Balance Calculation from API Transactions
//       let calculatedBalance = 0;
//       const formattedOrders = transactions.map(trans => {
//         const p = parseFloat(trans.points) || 0;
        
//         // Agar CREDIT hai toh plus, DEBIT hai toh minus
//         if (trans.type === "CREDIT") {
//           calculatedBalance += p;
//         } else if (trans.type === "DEBIT") {
//           calculatedBalance -= p;
//         }

//         return {
//           orderNumber: trans.orderId || "",
//           createdAt: trans.txnTimestamp * 1000, 
//           points: p,
//           type: trans.type === "CREDIT" ? "earned" : "redeemed",
//           status: trans.description.toLowerCase().includes("cancelled") ? "CANCELLED" : "PROCESSED",
//           description: trans.description.replace(/##/g, '#')
//         };
//       });

//       return data({ 
//         status: "success", 
//         orders: formattedOrders,
//         // .toFixed(2) taaki decimal points handle ho sakein
//         totalPoints: parseFloat(calculatedBalance.toFixed(2)) 
//       });
//     }

//     return data({ status: "fail", message: "Invalid API Response" });

//   } catch (error) {
//     console.error("Proxy Error:", error);
//     return data({ status: "error", message: error.message }, { status: 500 });
//   }
// };