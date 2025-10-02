import fetch from "node-fetch";
import * as cheerio from "cheerio";
import OpenAI from "openai";

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

    // Fetch website content
    const response = await fetch(url);
    const html = await response.text();

    // Extract text using cheerio
    const $ = cheerio.load(html);
    let text = $("body").text().replace(/\s+/g, " ").trim();
    text = text.substring(0, 4000); // limit for GPT

    // GPT request to extract 10 keywords
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a keyword extractor. Extract 10 concise keywords about the website's products, services, or brands."
        },
        { role: "user", content: text }
      ]
    });

    let keywords = completion.choices[0].message.content
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
