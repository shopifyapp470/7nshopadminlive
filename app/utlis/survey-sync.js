import { data } from "react-router";

// export async function syncSurveyToShopify(admin, session, survey) {
//   const { shop, accessToken } = session;

//   console.log('test');
//   // 1. CONFIGURATION: Aapke manual JSON se uthaya gaya path
//   // '7nshop-admin-app' aapka app handle hai
//   // 'survey-form' aapka block file name hai
//   // '019ae995-5b96-7b90-8edb-844a2bbcc358' aapka specific block ID hai
//   const BLOCK_TYPE = "shopify://apps/7nshop-admin-app/blocks/survey-form/019ae995-5b96-7b90-8edb-844a2bbcc358";

//   const handle = survey.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
//   const templateSuffix = `survey-${handle}`;
//   const templateKey = `templates/page.${templateSuffix}.json`;

//   try {
//     const themeResponse = await admin.graphql(`query { themes(first: 10) { nodes { id role } } }`);
//     const themeData = await themeResponse.json();
//     const mainTheme = themeData.data.themes.nodes.find(t => t.role === "MAIN");
//     const THEME_ID = mainTheme.id.split("/").pop();

//     // 2. UNIQUE KEYS: Bilkul waisa hi format jaisa manual JSON mein tha
//     const sectionId = `section_${Math.random().toString(36).substring(2, 10)}`;
//     const blockInstanceId = `7nshop_admin_app_survey_form_${Math.random().toString(36).substring(2, 8)}`;

//     // 3. COMPLETE JSON STRUCTURE
//     const templateJSON = {
//       "sections": {
//         [sectionId]: {
//           "type": "apps",
//           "blocks": {
//             [blockInstanceId]: {
//               "type": BLOCK_TYPE,
//               "settings": {
//                 "heading": survey.title,       // Database se 'winter collection'
//                 "question_text": survey.question, // Database se 'how to check...'
//                 "survey_id": survey.id.toString(),
//                 "status": survey.status
//               }
//             }
//           },
//           "block_order": [blockInstanceId],
//           "settings": {}
//         }
//       },
//       "order": [sectionId]
//     };

//     // 4. Update Asset API
//     const assetResponse = await fetch(`https://${shop}/admin/api/2025-01/themes/${THEME_ID}/assets.json`, {
//       method: "PUT",
//       headers: { 
//         "X-Shopify-Access-Token": accessToken, 
//         "Content-Type": "application/json" 
//       },
//       body: JSON.stringify({ 
//         asset: { 
//           key: templateKey, 
//           value: JSON.stringify(templateJSON) 
//         } 
//       }),
//     });

//     if (!assetResponse.ok) throw new Error("Asset sync failed");

//     // 5. Create Page
//     await admin.graphql(`#graphql
//       mutation {
//         pageCreate(page: { 
//           title: "${survey.title}", 
//           templateSuffix: "${templateSuffix}", 
//           isPublished: true 
//         }) { page { id } }
//       }`
//     );

//     console.log(`✅ Success: Page created with Dynamic Database Data!`);
//     return { success: true };

//   } catch (error) {
//     console.error("❌ Sync Error:", error.message);
//     throw error;
//   }
// }

// suvery-sync.js
// app/utils/survey-sync.js

// export async function syncSurveyToShopify(admin, session, survey, isNew = false) {
//   const { shop, accessToken } = session;

//   // 1. CONFIGURATION: Aapke block ka exact path
//   const BLOCK_TYPE = "shopify://apps/7nshop-admin-app/blocks/survey-form/019ae995-5b96-7b90-8edb-844a2bbcc358";

//   // Handle ko ID par base rakhein taaki title change hone par template file na badle
//   const templateSuffix = `survey-${survey.id}`;
//   const templateKey = `templates/page.${templateSuffix}.json`;

//   try {
//     const themeResponse = await admin.graphql(`query { themes(first: 10) { nodes { id role } } }`);
//     const themeData = await themeResponse.json();
//     const mainTheme = themeData.data.themes.nodes.find(t => t.role === "MAIN");
//     const THEME_ID = mainTheme.id.split("/").pop();

//     // 2. TEMPLATE JSON: Static keys use karein taaki edit par overwrite ho
//     const templateJSON = {
//       "sections": {
//         "section_main": {
//           "type": "apps",
//           "blocks": {
//             "survey_block": {
//               "type": BLOCK_TYPE,
//               "settings": {
//                 "heading": survey.title,
//                 "question_text": survey.question,
//                 "survey_id": survey.id.toString(),
//                 "status": survey.status
//               }
//             }
//           },
//           "block_order": ["survey_block"],
//           "settings": {}
//         }
//       },
//       "order": ["section_main"]
//     };

//     // 3. Update/Create Theme Asset (.json file)
//     await fetch(`https://${shop}/admin/api/2025-01/themes/${THEME_ID}/assets.json`, {
//       method: "PUT",
//       headers: { 
//         "X-Shopify-Access-Token": accessToken, 
//         "Content-Type": "application/json" 
//       },
//       body: JSON.stringify({ 
//         asset: { 
//           key: templateKey, 
//           value: JSON.stringify(templateJSON) 
//         } 
//       }),
//     });

//     // 4. Create Page: Sirf tabhi jab Naya Survey ho
//     if (isNew) {
//       await admin.graphql(`#graphql
//         mutation {
//           pageCreate(page: { 
//             title: "${survey.title}", 
//             templateSuffix: "${templateSuffix}", 
//             isPublished: true 
//           }) { 
//             page { id handle } 
//             userErrors { field message }
//           }
//         }`
//       );
//       console.log(`✅ New Shopify Page Created`);
//     } else {
//       console.log(`✅ Shopify Template Updated (No new page created)`);
//     }

//     return { success: true };

//   } catch (error) {
//     console.error("❌ Sync Error:", error.message);
//     throw error;
//   }
// }
// export async function deleteSurveyFromShopify(admin, session, survey) {
//   const { shop, accessToken } = session;
//   const templateSuffix = `survey-${survey.id}`;
//   const templateKey = `templates/page.${templateSuffix}.json`;

//   try {
//     // 1. GET THEME ID
//     const themeResponse = await admin.graphql(`query { themes(first: 10) { nodes { id role } } }`);
//     const themeData = await themeResponse.json();
//     const mainTheme = themeData.data.themes.nodes.find(t => t.role === "MAIN");
//     const THEME_ID = mainTheme.id.split("/").pop();

//     // 2. DELETE THEME ASSET (JSON File)
//     await fetch(`https://${shop}/admin/api/2025-01/themes/${THEME_ID}/assets.json?asset[key]=${templateKey}`, {
//       method: "DELETE",
//       headers: { "X-Shopify-Access-Token": accessToken },
//     });
//     console.log(` Asset Deleted: ${templateKey}`);

//     // 3. FIND & DELETE SHOPIFY PAGE
//     // Pehle handle ke zariye page ki ID dhoondhte hain
//     const getPage = await admin.graphql(`#graphql
//       query {
//         pages(first: 1, query: "handle:survey-${survey.id}") {
//           nodes { id }
//         }
//       }`
//     );
//     const pageData = await getPage.json();
//     const pageId = pageData.data?.pages?.nodes[0]?.id;

//     if (pageId) {
//       await admin.graphql(`#graphql
//         mutation {
//           pageDelete(id: "${pageId}") {
//             deletedPageId
//             userErrors { message }
//           }
//         }`
//       );
//       console.log(` Shopify Page Deleted: ${pageId}`);
//     }

//     return { success: true };
//   } catch (error) {
//     console.error(" Delete Sync Error:", error.message);
//     return { success: false, error: error.message };
//   }
// }
// export async function deleteSurveyFromShopify(admin, session, survey) {
//   const { shop, accessToken } = session;
//   const surveyId = survey.id.toString();
//   const templateSuffix = `survey-${surveyId}`;
//   const templateKey = `templates/page.${templateSuffix}.json`;

//   try {
//     // 1. GET THEME ID
//     const themeResponse = await admin.graphql(`query { themes(first: 10) { nodes { id role } } }`);
//     const themeData = await themeResponse.json();
//     const mainTheme = themeData.data.themes.nodes.find(t => t.role === "MAIN");
//     const THEME_ID = mainTheme.id.split("/").pop();

//     // 2. DELETE THEME ASSET (JSON File) - Ye aapki image (page.survey-ID.json) ko delete karega
//     await fetch(`https://${shop}/admin/api/2025-01/themes/${THEME_ID}/assets.json?asset[key]=${templateKey}`, {
//       method: "DELETE",
//       headers: { "X-Shopify-Access-Token": accessToken },
//     });
//     console.log(` Asset Deleted: ${templateKey}`);

//     // 3. FIND PAGE BY TEMPLATE SUFFIX
//     // Handle kabhi-kabhi change ho jata hai, isliye suffix se dhoondhna safe hai
//     const getPage = await admin.graphql(`#graphql
//       query {
//         pages(first: 50) {
//           nodes {
//             id
//             templateSuffix
//           }
//         }
//       }`
//     );
//     const pageData = await getPage.json();
    
//     // Wo page dhoondho jiska templateSuffix aapki survey ID se match karta ho
//     const targetPage = pageData.data?.pages?.nodes.find(
//       (p) => p.templateSuffix === templateSuffix
//     );

//     // 4. DELETE SHOPIFY PAGE
//     if (targetPage && targetPage.id) {
//       await admin.graphql(`#graphql
//         mutation pageDelete($id: ID!) {
//           pageDelete(id: $id) {
//             deletedPageId
//             userErrors { message }
//           }
//         }`,
//         { variables: { id: targetPage.id } }
//       );
//       console.log(` Shopify Page Deleted: ${targetPage.id}`);
//     } else {
//       console.log(" No Shopify Page found with this template suffix.");
//     }

//     return { success: true };
//   } catch (error) {
//     console.error("❌ Delete Sync Error:", error.message);
//     return { success: false, error: error.message };
//   }
// }