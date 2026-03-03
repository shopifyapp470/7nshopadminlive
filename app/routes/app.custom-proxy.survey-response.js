import { data } from "react-router";
import { authenticate } from "../shopify.server";
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
    const { admin } = await authenticate.public.appProxy(request);

    const body = await request.json();
    const { survey_id, answer, customer_email, customer_id } = body;

    if (!survey_id || !answer) {
      return data({ success: false, message: "Missing survey_id or answer" }, { status: 400, headers });
    }

    const responseEntry = await db.surveyResponse.create({
      data: {
        surveyId: survey_id,
        customerEmail: customer_email || "Guest",
        answerData: { response: answer },
      },
    });
    
    return data({ 
      success: true, 
      message: "Response saved and customer tagged!", 
      id: responseEntry.id 
    }, { headers });

  } catch (error) {
    console.error("Survey Response Error:", error);
    return data({ success: false, error: "Internal Server Error" }, { status: 500, headers });
  }
}

export async function loader() {
  return data({ status: "Survey Response API is active" });
}