export async function syncRewardTemplate(admin, session) {
  const { shop, accessToken } = session;

  const APP_HANDLE = "7nshop-admin-app"; 
  const BLOCK_FILENAME = "app-block";
  //const BLOCK_UUID = "019ae995-5b96-7b90-8edb-844a2bbcc358";
  const BLOCK_UUID = "0a018d28-0a0e-263a-5d9d-c06fbd32a278";






  const BLOCK_TYPE = `shopify://apps/${APP_HANDLE}/blocks/${BLOCK_FILENAME}/${BLOCK_UUID}`;
  const templateSuffix = "reward-redeem";
  const templateKey = `templates/page.${templateSuffix}.json`;

  try {
    const themeResponse = await admin.graphql(`query { themes(first: 10) { nodes { id role } } }`);
    const themeData = await themeResponse.json();
    const mainTheme = themeData.data.themes.nodes.find(t => t.role === "MAIN");
    const THEME_ID = mainTheme.id.split("/").pop();
    const templateJSON = {
      "sections": {
        "reward_section": {
          "type": "apps",
          "blocks": {
            "reward_app_block": {
              "type": BLOCK_TYPE,
              "settings": {
                "hero_title": "Your Reward Points",
                "hero_subtitle": "You may redeem on your next purchase",
                "redeem_title": "How to Redeem",
                "redeem_desc": "Redeem your points during checkout...",
                "policy_title": "Reward Points Policy",
                "policy_1": "Maximum points value cannot exceed order value",
                "policy_2": "Reward Points never expire",
                "policy_3": "Non-transferable between accounts"
              }
            }
          },
          "block_order": ["reward_app_block"],
          "settings": {}
        }
      },
      "order": ["reward_section"]
    };
    await fetch(`https://${shop}/admin/api/2025-01/themes/${THEME_ID}/assets.json`, {
      method: "PUT",
      headers: { 
        "X-Shopify-Access-Token": accessToken, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        asset: { 
          key: templateKey, 
          value: JSON.stringify(templateJSON) 
        } 
      }),
    });
    const checkPage = await admin.graphql(`
      query {
        pages(first: 1, query: "handle:my-rewards") {
          nodes { id handle }
        }
      }
    `);
    const checkPageData = await checkPage.json();
    const existingPage = checkPageData.data?.pages?.nodes[0];

    if (!existingPage) {
      await admin.graphql(`#graphql
        mutation {
          pageCreate(page: { 
            title: "My Rewards", 
            handle: "my-rewards",
            templateSuffix: "${templateSuffix}", 
            isPublished: true 
          }) { 
            page { id handle } 
            userErrors { field message }
          }
        }`
      );
      console.log(`Reward Page Created Successfully`);
    } else {
      console.log(`Template Updated, Page already exists.`);
    }
    return { success: true };
  } catch (error) {
    console.error("Reward Sync Error:", error.message);
    throw error;
  }
}