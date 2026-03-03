import { data } from "react-router"; 
import db from "../db.server";

export async function action({ request }) {
 const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (request.method !== "POST") {
    return data({ message: "Method not allowed" }, { status: 405, headers });
  }

  try {
    const body = await request.json();
    const { handle, senderEmail, receiverEmail, title } = body;

    const cleanHandle = handle?.trim();
    const cleanSender = senderEmail?.trim().toLowerCase();
    const cleanReceiver = (receiverEmail || "guest").trim().toLowerCase();

    if (!cleanHandle || !cleanSender) {
      return data({ success: false, message: "Missing data" }, { status: 400, headers });
    }

    if (cleanSender === cleanReceiver) {
      console.log(`Sender & Receiver are SAME: ${cleanSender}`);
      return data({ 
        success: true, 
        message: "Self-view ignored. No database entry added.",
        isNew: false 
      }, { headers });
    }

    const survey = await db.survey.findFirst({
      where: { link: { contains: cleanHandle } }
    });

    if (!survey) {
      console.log(" Survey Not Found for handle:", cleanHandle);
      return data({ success: false, message: "Survey not found" }, { status: 404, headers });
    }

    const cleanTitle = (title || survey.title).trim();

    const existingResponse = await db.surveyResponse.findFirst({
      where: {
        surveyId: survey.id,
        title: cleanTitle,
        senderEmail: cleanSender,
        receiverEmail: cleanReceiver,
      }
    });

    let finalResponse;

    if (existingResponse) {
      finalResponse = await db.surveyResponse.update({
        where: { id: existingResponse.id },
        data: { count: { increment: 1 } }
      });

    console.log(`[EXISTING ENTRY UPDATED] | Title: ${finalResponse.title} | Sender: ${finalResponse.senderEmail} | Receiver: ${finalResponse.receiverEmail} | New Count: ${finalResponse.count}`);

    } else {
      finalResponse = await db.surveyResponse.create({
        data: {
          surveyId: survey.id,
          title: cleanTitle,
          senderEmail: cleanSender,
          receiverEmail: cleanReceiver,
          count: 1
        },
      });

   console.log(`[NEW ENTRY CREATED] | Title: ${finalResponse.title} | Sender: ${finalResponse.senderEmail} | Receiver: ${finalResponse.receiverEmail} | Count: 1`);
    }

    await db.survey.update({
      where: { id: survey.id },
      data: { views: { increment: 1 } }
    });

    return data({ 
      success: true, 
      count: finalResponse.count, 
      isNew: !existingResponse 
    }, { headers });

  } catch (error) {
    console.error("Survey Tracking Error:", error);
    return data({ success: false, error: "Internal Error" }, { status: 500, headers });
  }
}