import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate staff
    await requireStaff();

    // 2. Resolve Gemini API Key (from header or env variables)
    const headerKey = req.headers.get("x-gemini-key")?.trim();
    const apiKey =
      headerKey ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GOOGLE_AI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          needsApiKey: true,
          error:
            "Walang Gemini API key na nakita. Pakilagay ang iyong Google Gemini API Key para ma-activate ang AI Scanner.",
        },
        { status: 400 }
      );
    }

    // 3. Extract request body / file
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const categoriesJson = formData.get("categories") as string | null;
    const branchesJson = formData.get("branches") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No receipt file uploaded to scan" },
        { status: 400 }
      );
    }

    const categories: Array<{ id: string; name: string }> = categoriesJson
      ? JSON.parse(categoriesJson)
      : [];
    const branches: Array<{ id: string; name: string }> = branchesJson
      ? JSON.parse(branchesJson)
      : [];

    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // 4. Construct prompt for Gemini Vision
    const categoriesString = categories.map((c) => `- ${c.name} (id: ${c.id})`).join("\n");
    const branchesString = branches.map((b) => `- ${b.name} (id: ${b.id})`).join("\n");

    const systemPrompt = `
You are an expert Philippine accounting & audit assistant for "Cindyrella Aesthetic & Wellness Clinic".
Analyze this receipt, sales invoice, official receipt (OR), or POS cash register tape photo with extreme precision.

Extract the financial and transaction details into a structured JSON response.

AVAILABLE EXPENSE CATEGORIES:
${categoriesString || "Clinic Supplies, Office Supplies, Cleaning Supplies, Repairs, Petty Cash, Staff Meals, Equipment"}

AVAILABLE CLINIC BRANCHES:
${branchesString || "Davao Branch, General Santos Branch, Tagum Branch"}

JSON SCHEMA TO RETURN:
{
  "vendor": string, // Merchant / store / supplier business name (e.g. "NDS NCCC DEPARTMENT STORE", "SM STORE DAVAO", "UNITOP GENERAL MERCHANDISE, INC.", "AGENZIE BERDE MERCHANDISING CORPORATION")
  "invoiceNumber": string, // Official Receipt (OR) #, Sales Invoice (SI) #, or Transaction # (e.g. "202665", "87885", "00-076438", "000009996")
  "expenseDate": string, // Transaction date strictly in YYYY-MM-DD format. If year is '26' assume '2026'.
  "amountBeforeTax": number, // VATable Sales or Net of VAT amount. If none or exempt, equal to totalAmount.
  "taxAmount": number, // 12% VAT amount. If zero or not specified, 0.
  "totalAmount": number, // Grand Total / Total Amount Due in PHP.
  "paymentMethod": "cash" | "petty_cash" | "cashier_drawer" | "credit_card" | "bank_transfer" | "gcash" | "maya" | "other",
  "paymentAccount": string, // Recommended source e.g. "Petty Cash Box - Davao", "Cashier Drawer - Davao", "Company Credit Card", "ATM/Debit Card ending 0000"
  "suggestedCategoryName": string, // Closest matching category name from available categories
  "suggestedCategoryId": string | null, // ID of matching category from list
  "suggestedBranchName": string, // Closest matching branch name from available branches
  "suggestedBranchId": string | null, // ID of matching branch if detected from receipt text (e.g. Davao City, DVAO)
  "title": string, // Short descriptive title e.g. "Clinic & Office Supplies - Unitop Davao"
  "lineItems": [
    {
      "description": string,
      "quantity": number,
      "unitPrice": number,
      "amount": number
    }
  ],
  "formattedBreakdown": string, // Beautiful clean multiline bulleted text with item name, qty, and price
  "auditorNotes": string // Notes e.g. Cashier name, TIN, store address, machine serial number, or card approval codes
}

RULES FOR EXTRACTION:
1. Philippine Receipts often specify "VATable Sales", "VAT Amount", and "Total Sales (VAT Inclusive)". Extract these accurately.
2. If "CHARGE/ATM ON-LINE", "CREDIT CARD", or "MASTERCARD/VISA" is seen, set paymentMethod to "credit_card". If "CASH", set to "cash".
3. If the receipt says "CINDYRELLA DRIP DVAO", "Davao City", or "SM City Davao", match it to the Davao Branch!
4. Return ONLY pure valid JSON, no markdown backticks, no commentary.
`;

    // 5. Call Gemini API
    const modelsToTry = [
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ];


    let lastError = "";
    let extractedText = "";

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: systemPrompt },
                  {
                    inlineData: {
                      mimeType: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          lastError = `Gemini (${model}) error: ${response.status} - ${errBody}`;
          continue;
        }

        const resData = await response.json();
        const candidateText =
          resData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (candidateText) {
          extractedText = candidateText;
          break;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : "Gemini fetch failed";
      }
    }

    if (!extractedText) {
      return NextResponse.json(
        {
          success: false,
          error:
            lastError ||
            "Failed to parse receipt with AI. Please make sure the image is clear or check your API key.",
        },
        { status: 502 }
      );
    }

    // 6. Clean and parse JSON
    let parsed: any;
    try {
      // Strip potential markdown code fences if any
      const cleaned = extractedText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "AI returned invalid response format. Please try again.",
          rawText: extractedText,
        },
        { status: 500 }
      );
    }

    // 7. Match category & branch IDs if not already matched
    if (!parsed.suggestedCategoryId && parsed.suggestedCategoryName) {
      const match = categories.find(
        (c) =>
          c.name.toLowerCase() === parsed.suggestedCategoryName.toLowerCase() ||
          c.name.toLowerCase().includes(parsed.suggestedCategoryName.toLowerCase()) ||
          parsed.suggestedCategoryName.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) {
        parsed.suggestedCategoryId = match.id;
      }
    }

    if (!parsed.suggestedBranchId && parsed.suggestedBranchName) {
      const match = branches.find(
        (b) =>
          b.name.toLowerCase().includes(parsed.suggestedBranchName.toLowerCase()) ||
          parsed.suggestedBranchName.toLowerCase().includes(b.name.toLowerCase())
      );
      if (match) {
        parsed.suggestedBranchId = match.id;
      }
    }

    // Fallback branch if "Davao" is mentioned anywhere in raw parsed data
    if (!parsed.suggestedBranchId) {
      const allText = JSON.stringify(parsed).toLowerCase();
      if (allText.includes("davao") || allText.includes("dvao")) {
        const davaoBranch = branches.find((b) =>
          b.name.toLowerCase().includes("davao")
        );
        if (davaoBranch) {
          parsed.suggestedBranchId = davaoBranch.id;
          parsed.suggestedBranchName = davaoBranch.name;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
