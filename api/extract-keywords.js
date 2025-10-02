import chromium from "chrome-aws-lambda";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(req.body.url, { waitUntil: "networkidle2" });

    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();

    // Send text to OpenAI...
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch keywords" });
  }
}
