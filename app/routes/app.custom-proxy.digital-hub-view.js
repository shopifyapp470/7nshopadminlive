import { data, redirect } from "react-router"; 
import db from "../db.server";

export async function loader({ request }) {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "redirect") {
        const to = url.searchParams.get("to");
        const title = url.searchParams.get("title");
        const sender = url.searchParams.get("utm_source");
        const shop = url.searchParams.get("shop") || "7nshop-test.myshopify.com";

        if (to && title && sender) {
            try {
                const cleanSender = sender.trim().toLowerCase();
                let domainLabel = "external_link";
                try {
                    const hostname = new URL(to).hostname.replace('www.', '');
                    domainLabel = `external_${hostname}`;
                } catch (e) {
                    domainLabel = "external_unknown";
                }

                const parentLink = await db.digitalHubLink.findFirst({
                    where: { name: title, shop: shop }
                });

                const result = await db.digitalHubView.upsert({
                    where: {
                        linkId_senderEmail_receiverEmail: {
                            linkId: parentLink ? parentLink.id : "external_asset",
                            senderEmail: cleanSender,
                            receiverEmail: domainLabel 
                        }
                    },
                    update: { 
                        count: { increment: 1 }, 
                        updatedAt: new Date() 
                    },
                    create: {
                        linkId: parentLink ? parentLink.id : "external_asset",
                        name: title,
                        senderEmail: cleanSender,
                        receiverEmail: domainLabel,
                        shop: shop,
                        count: 1
                    }
                });

                console.log(`[DIRECT REDIRECT] Sender: ${cleanSender} | Platform: ${domainLabel}`);

            } catch (error) {
                console.error(" Tracking Error:", error.message);
            }
        }
        return redirect(to);
    }
    return data({ message: "Invalid Request" }, { status: 400 });
}

export async function action({ request }) {
    try {
        const body = await request.json();
        const { linkName, senderEmail, receiverEmail, shop } = body;

        const cleanSender = senderEmail?.trim().toLowerCase();
        const cleanReceiver = (receiverEmail || "guest").trim().toLowerCase();

        if (cleanSender === cleanReceiver) {
            console.log(`>>> [SKIPPED] Self-view by ${cleanSender}`);
            return data({ success: true, status: "SKIPPED" });
        }

        const parentLink = await db.digitalHubLink.findFirst({
            where: { name: linkName, shop: shop }
        });

        const result = await db.digitalHubView.upsert({
            where: {
                linkId_senderEmail_receiverEmail: {
                    linkId: parentLink.id,
                    senderEmail: cleanSender,
                    receiverEmail: cleanReceiver
                }
            },
            update: { count: { increment: 1 }, updatedAt: new Date() },
            create: {
                linkId: parentLink.id,
                name: linkName,
                senderEmail: cleanSender,
                receiverEmail: cleanReceiver,
                shop: shop,
                count: 1
            }
        });
        console.log(` [SHOPIFY VIEW] Asset: ${linkName} | Sender: ${cleanSender} | Receiver: ${cleanReceiver} | New Count: ${result.count}`);
        return data({ success: true, currentCount: result.count });
    } catch (error) {
        console.error(" Action Error:", error.message);
        return data({ success: false, error: error.message }, { status: 500 });
    }
}