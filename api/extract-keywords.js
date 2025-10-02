import OpenAI from "openai";
import puppeteer from "puppeteer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Launch Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" }); // Wait until network is idle

    // Extract all visible text including menu items
    const text = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      let menuText = "";
      const menuSelectors = ["nav a", "header a", ".menu a", ".navbar a"];
      menuSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          menuText += el.innerText + " ";
        });
      });
      return (bodyText + " " + menuText).replace(/\s+/g, " ").trim();
    });

    await browser.close();

    if (!text || text.length < 20) {
      return res.status(200).json({
        keywords: [],
        message:
          "It seems there’s no content available to extract keywords. Please provide website details."
      });
    }

    // GPT request to extract 10 keywords
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a keyword extractor. Extract 10 concise keywords about the website's products, services, brands, or categories, including menu items."
        },
        { role: "user", content: text.substring(0, 4000) }
      ]
    });

    const keywords = completion.choices[0].message.content
      .split("\n")
      .map(k => k.replace(/^\d+\. /, "").trim())
      .filter(k => k.length > 0)
      .slice(0, 10);

    res.status(200).json({ url, keywords });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch keywords" });
  }
}
