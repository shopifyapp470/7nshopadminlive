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
    const { employeeEmail, assetId, assetName } = body;
    if (!employeeEmail || !assetId) {
      return data({ success: false, message: "Missing data" }, { status: 400, headers });
    }
    const track = await db.downloadLog.upsert({
      where: {
        employeeEmail_assetId: {
          employeeEmail: employeeEmail,
          assetId: assetId,
        },
      },
      update: {
        downloadCount: { increment: 1 },
        lastDownloaded: new Date(),
      },
      create: {
        employeeEmail,
        assetId,
        assetName: assetName || "Unknown File",
        downloadCount: 1,
      },
    });

    return data({ success: true, count: track.downloadCount }, { headers });
  } catch (error) {
    console.error("Tracking Error:", error);
    return data({ success: false, error: "Internal Server Error" }, { status: 500, headers });
  }
}

export async function loader() {
  return data({ status: "Tracker is active" });
}