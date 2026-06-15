import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazily load and initialize the Gemini client to assert keys and avoid load crash
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is missing. Configure via the Secrets dashboard."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json());

  // ===========================
  // Gemini Financial Insights API
  // ===========================
  app.post("/api/insights/generate", async (req, res) => {
    try {
      const { transactions, budgets } = req.body;
      if (
        !transactions ||
        !Array.isArray(transactions) ||
        transactions.length === 0
      ) {
        return res
          .status(400)
          .json({ error: "Ledger has no transactions to generate insights." });
      }

      const client = getGeminiClient();

      const prompt = `Analyze this user's transactional financial ledger and their active budgets:
      
Budgets:
${JSON.stringify(budgets)}

Transactions LEDGER (all positive numbers represent spending; negative values represent income/refunds):
${JSON.stringify(
  transactions.map((t: any) => ({
    date: t.date,
    category: t.category,
    merchant: t.merchant,
    amount: t.amount,
  }))
)}

Provide:
1. A top-tier, concierge-style executive financial performance summary (3-4 sentences max), speaking as a sophisticated wealth concierge.
2. Tailored high-impact tips (saves) specifically matching their highest category spending. Do not offer canned generic advice (like "buy less coffee"), analyze their actual numbers and name specific merchant trends.
3. Precise alerts highlighting where spending matches or exceeds allocation benchmarks.
4. A personal elite wealth score (0 to 100) reflecting savings progress, allocation balance, and premium budget discipline.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are the lead wealth advisor at an exclusive private family office. 
Your advice is highly encouraging, sophisticated, actionable, and entirely tailored to the provided transaction list. 
Respond strictly in JSON according to the schema provided.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description:
                  "Sophisticated executive summary of allocations, cash flow patterns, and major progress.",
              },
              topSaves: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    tips: {
                      type: Type.STRING,
                      description:
                        "Highly customized smart advice mentioning their transactional patterns.",
                    },
                    impact: {
                      type: Type.STRING,
                      description: "One of: High, Medium, Low",
                    },
                  },
                  required: ["category", "tips", "impact"],
                },
              },
              budgetAlerts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    level: {
                      type: Type.STRING,
                      description: "One of: info, warning, critical",
                    },
                  },
                  required: ["title", "description", "level"],
                },
              },
              financialScore: {
                type: Type.INTEGER,
                description: "Wealth index score on a scale of 0 to 100",
              },
            },
            required: ["summary", "topSaves", "budgetAlerts", "financialScore"],
          },
        },
      });

      const jsonText = response.text?.trim() || "{}";
      const resultObj = JSON.parse(jsonText);
      res.json(resultObj);
    } catch (error: any) {
      console.error("Gemini API Server Error:", error?.message || error);
      res.status(500).json({
        error:
          error?.message || "An exception occurred inside the secured Gemini proxy.",
        missingKey: !process.env.GEMINI_API_KEY,
      });
    }
  });

  // ===========================
  // Google Sheets proxy (GViz)
  // ===========================
  app.get("/api/proxy-sheet", async (req, res) => {
    try {
      const { sheetId, sheetUrl } = req.query;
      if (!sheetId) {
        return res.status(400).json({ error: "sheetId parameter is required" });
      }

      // Robust extraction of sheet ID if full URL was passed
      let safeSheetId = String(sheetId).trim();
      const driveMatch = safeSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (driveMatch) {
        safeSheetId = driveMatch[1];
      }

      let url = `https://docs.google.com/spreadsheets/d/${safeSheetId}/gviz/tq?tqx=out:json&t=${Date.now()}`;
      const targetUrl = (sheetUrl as string) || (sheetId as string);

      const gidMatch = targetUrl.match(/[#&?]gid=([0-9]+)/);
      if (gidMatch) {
        url += `&gid=${gidMatch[1]}`;
      }

      const sheetNameMatch = targetUrl.match(/[#&?]sheet=([^&]+)/);
      if (sheetNameMatch) {
        url += `&sheet=${sheetNameMatch[1]}`;
      }

      console.log(`[Proxy Sheet Fetching] Requesting: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/437.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36",
          Accept: "*/*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Google Sheets servers returned HTTP Status ${response.status}. Please verify the spreadsheet ID/URL is correct and shared publicly.`
        );
      }

      const text = await response.text();
      const match = text.match(
        /google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/
      );

      if (!match) {
        // Likely a sign-in wall (sheet not public)
        if (
          text.includes("ServiceLogin") ||
          text.includes("sign-in") ||
          text.includes("accounts.google.com") ||
          text.includes("doc-signin")
        ) {
          throw new Error(
            "This spreadsheet is private or locked. To fix this, open Google Sheets, tap the gold 'Share' button, and set General Access to 'Anyone with the link can view'."
          );
        }
        throw new Error(
          "Invalid spreadsheet response format. Please verify the spreadsheet is shared with 'Anyone with the link can view' settings."
        );
      }

      const parsed = JSON.parse(match[1]);
      if (parsed.status === "error") {
        throw new Error(
          `Google Query API Error: ${
            parsed.errors?.[0]?.detailed_message ||
            parsed.errors?.[0]?.message ||
            "Access blocked"
          }`
        );
      }

      res.json(parsed.table);
    } catch (error: any) {
      console.error("[Proxy Sheet Error handler]:", error);
      res.status(500).json({
        error: error?.message || "Failed to retrieve and proxy spreadsheet data.",
      });
    }
  });

  // ===========================
  // Google Drive folder scraper
  // ===========================
  app.get("/api/proxy-drive-folder", async (req, res) => {
    try {
      const { folderId } = req.query;
      if (!folderId) {
        return res.status(400).json({ error: "folderId parameter is required" });
      }

      // Robust extraction of folder ID if full URL was passed
      let safeFolderId = String(folderId).trim();

      // Match drive.google.com/drive/folders/ID or drive.google.com/drive/u/0/folders/ID
      const folderMatches = safeFolderId.match(
        /\/folders\/([a-zA-Z0-9-_]{25,55})/
      );
      if (folderMatches) {
        safeFolderId = folderMatches[1];
      }

      console.log(
        `[Proxy Drive Folder Fetching] Scraped Folder ID: ${safeFolderId}`
      );

      // Google Drive public embedded folder view page
      const url = `https://drive.google.com/embeddedfolderview?id=${safeFolderId}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/437.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36",
          Accept: "*/*",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Google Drive servers returned HTTP Status ${response.status}. Please verify the folder exists.`
        );
      }

      const html = await response.text();

      // Check for sign-in wall => folder not public
      if (
        html.includes("ServiceLogin") ||
        html.includes("sign-in") ||
        html.includes("accounts.google.com") ||
        html.includes("doc-signin")
      ) {
        throw new Error(
          "This Google Drive folder is locked or restricted. To allow auto-syncing, open the folder on Google Drive, click 'Share', and change general access setting to 'Anyone with the link can view'."
        );
      }

      const foundIdsSet = new Set<string>();

      // /file/d/ID/view
      const fileDMatches = html.matchAll(
        /\/file\/d\/([a-zA-Z0-9-_]{19,80})/g
      );
      for (const match of fileDMatches) {
        if (match[1]) foundIdsSet.add(match[1]);
      }

      // ?id=ID or &id=ID
      const queryIdMatches = html.matchAll(
        /[?&]id=([a-zA-Z0-9-_]{19,80})/g
      );
      for (const match of queryIdMatches) {
        if (match[1]) foundIdsSet.add(match[1]);
      }

      // "id":"ID"
      const jsonIdMatches = html.matchAll(
        /"id"\s*:\s*"([a-zA-Z0-9-_]{19,80})"/g
      );
      for (const match of jsonIdMatches) {
        if (match[1]) foundIdsSet.add(match[1]);
      }

      // Remove folder ID itself
      foundIdsSet.delete(safeFolderId);

      const fileIds = Array.from(foundIdsSet);
      console.log(
        `[Proxy Drive Folder Fetching] Extracted ${fileIds.length} sub-files inside folder ${safeFolderId}`
      );

      const parsedSlides = fileIds.map((id, index) => ({
        id: `drive-scraped-${id}-${index}`,
        url: `/api/proxy-drive-file?id=${id}`,
        title: `Drive Media #${index + 1}`,
        caption: "Automatically synchronised from Google Drive.",
        category: "Vision",
      }));

      res.json({
        success: true,
        folderId: safeFolderId,
        count: parsedSlides.length,
        slides: parsedSlides,
      });
    } catch (error: any) {
      console.error("[Proxy Drive Folder Scraper Error]:", error);
      res.status(500).json({
        error: error?.message || "Failed to scan public Google Drive Folder assets.",
      });
    }
  });

  // ===========================
  // Google Drive file proxy
  // ===========================
  app.get("/api/proxy-drive-file", async (req, res) => {
    const fileId = String(req.query.id || "").trim();
    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    const urlEndpoints = [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
      `https://docs.google.com/uc?export=download&id=${fileId}`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
    ];

    for (const targetUrl of urlEndpoints) {
      try {
        console.log(
          `[Proxy Drive File Stream] Attempting fetch from: ${targetUrl}`
        );
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/437.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/437.36",
            Accept:
              "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },
        });

        if (!response.ok) {
          console.warn(
            `[Proxy Drive File Stream] ${targetUrl} returned status ${response.status}. Trying next...`
          );
          continue;
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/html")) {
          const html = await response.text();

          if (
            html.includes("ServiceLogin") ||
            html.includes("accounts.google.com") ||
            html.includes("doc-signin")
          ) {
            console.warn(
              `[Proxy Drive File Stream] ${targetUrl} hit sign-in screen. Trying next...`
            );
            continue;
          }

          const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
          if (confirmMatch && confirmMatch[1]) {
            console.log(
              `[Proxy Drive File Stream] Found virus scan confirmation code: ${confirmMatch[1]}. Retrying with confirm token...`
            );
            const secondResponse = await fetch(
              `https://docs.google.com/uc?export=download&id=${fileId}&confirm=${confirmMatch[1]}`,
              {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/437.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/437.36",
                },
              }
            );

            if (secondResponse.ok) {
              const secondContentType =
                secondResponse.headers.get("content-type") || "image/jpeg";
              if (!secondContentType.includes("text/html")) {
                res.setHeader("Content-Type", secondContentType);
                res.setHeader(
                  "Cache-Control",
                  "public, max-age=86400, stale-while-revalidate=3600"
                );
                const arrayBuffer = await secondResponse.arrayBuffer();
                return res.send(Buffer.from(arrayBuffer));
              }
            }
          }

          console.warn(
            `[Proxy Drive File Stream] HTML page returned from ${targetUrl} without workable confirm token. Trying next...`
          );
          continue;
        }

        // Got an image / media stream
        res.setHeader("Content-Type", contentType || "image/jpeg");
        res.setHeader(
          "Cache-Control",
          "public, max-age=86400, stale-while-revalidate=3600"
        );
        const arrayBuffer = await response.arrayBuffer();
        console.log(
          `[Proxy Drive File Stream] Successfully proxied direct media with Content-Type: ${contentType}`
        );
        return res.send(Buffer.from(arrayBuffer));
      } catch (error: any) {
        console.error(
          `[Proxy Drive File Stream] Error fetching from ${targetUrl}:`,
          error?.message || error
        );
      }
    }

    console.error(
      `[Proxy Drive File Stream] All endpoints failed to render the image for ID: ${fileId}. Check Drive share settings.`
    );

    const errSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <rect width="800" height="500" fill="#09090b"/>
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff0055" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#g)"/>
  <g transform="translate(400, 180)" text-anchor="middle">
    <path d="M-30,-50 L30,-50 L50,-10 L0,50 L-50,-10 Z" fill="none" stroke="#ff0055" stroke-width="4" stroke-linejoin="round"/>
    <path d="M0,-25 L0,10" stroke="#ff0022" stroke-width="5" stroke-linecap="round"/>
    <circle cx="0" cy="25" r="3.5" fill="#ff0022"/>
    <text y="90" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" letter-spacing="1">ACCESS RESTRICTED</text>
    <text y="125" font-family="monospace" font-size="12" fill="#ff0055" letter-spacing="2">PRIVATE GOOGLE DRIVE FILE</text>
    <text y="155" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#a1a1aa">To fix this, click 'Share' on your photo in Google Drive</text>
    <text y="180" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#a1a1aa">and change General Access to 'Anyone with the link can view'</text>
    <text y="215" font-family="monospace" font-size="10" fill="#52525b">FILE ID: ${fileId}</text>
  </g>
</svg>
`.trim();

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-cache");
    res.send(Buffer.from(errSvg));
  });

  // ===========================
  // Frontend (Vite) serving
  // ===========================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Full-stack Server Live] running on port ${PORT}`);
  });
}

startServer();

// Shared types
export interface AiInsight {
  summary: string;
  topSaves: {
    category: string;
    tips: string;
    impact: string; // "High", "Medium", "Low"
  }[];
  budgetAlerts: {
    title: string;
    description: string;
    level: "warning" | "info" | "critical";
  }[];
  financialScore: number; // 0 - 100 elite score
}

export interface SheetConfig {
  sheetUrl: string;
  sheetId: string;
  apiKey?: string;
  dateCol: string;
  categoryCol: string;
  merchantCol: string;
  amountCol: string;
  lastSynced?: string;
  autoSync: boolean;
}
