require("dotenv").config();
const express = require("express");
const axios   = require("axios");
const app     = express();

app.use(express.json());

app.post("/webhook", async (req, res) => {
  console.log("Alert received:", req.body);
  const { ticker, price, time } = req.body;
  if (!ticker || !price) return res.status(400).json({ error: "Missing fields" });
  try {
    const analysis = await askClaude(ticker, price, time);
    await sendToDiscord(ticker, price, analysis);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

async function askClaude(ticker, price, time) {
  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: `A swing trade setup just fired on ${ticker} at $${price}. All 5 conditions are confirmed: uptrend above 21 EMA, 5-15% pullback, near EMA support, RSI 35-50, volume drying up. In 3-4 sentences: is this a valid entry, where is the stop (2-3% below entry), and what is the target?` }],
    },
    { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" } }
  );
  return response.data.content[0].text;
}

async function sendToDiscord(ticker, price, analysis) {
  await axios.post(process.env.DISCORD_WEBHOOK_URL, {
    embeds: [{ title: `📈 Setup Alert: ${ticker}`, color: 0x00c853, fields: [{ name: "Price", value: `$${price}`, inline: true }, { name: "Claude's Analysis", value: analysis }], timestamp: new Date().toISOString() }]
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
