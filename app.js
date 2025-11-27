// app.js - Express API for Zeabur
// 使用方法：node app.js

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// 🔥 重要：CORS 設定（完全允許）🔥
// 這一段可以確保從 GitHub Pages、任何網域都能 fetch API
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// Express 預設 JSON parser（雖然你沒有 POST，但之後可能會用到）
app.use(express.json());

// 檔案路徑
const DATA_DIR = __dirname;
const COUNTRIES_FILE = path.join(DATA_DIR, "countries.json");
const VISA_FILE = path.join(DATA_DIR, "visa.json");

// 讀 JSON 工具
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("讀取 JSON 失敗：", filePath, e);
    return null;
  }
}

// ✔ GET /api/countries
app.get("/api/countries", (req, res) => {
  const list = readJSON(COUNTRIES_FILE);
  if (!list) return res.status(500).json({ error: "cannot read countries" });
  res.json(list);
});

// ✔ GET /api/visa/:country
app.get("/api/visa/:country", (req, res) => {
  const q = req.params.country.toLowerCase();
  const visaList = readJSON(VISA_FILE) || [];
  const countries = readJSON(COUNTRIES_FILE) || [];

  let found = visaList.find(v => (v.code || "").toLowerCase() === q);

  if (!found) {
    found = visaList.find(v => (v.name || "").toLowerCase() === q);
  }

  if (!found) {
    const c = countries.find(c =>
      (c.name_en || "").toLowerCase() === q ||
      (c.name_zh || "").toLowerCase() === q ||
      (c.code || "").toLowerCase() === q
    );

    if (c) {
      found = {
        code: c.code,
        name: c.name_en || c.name_zh || c.code,
        visa_requirement: "unknown (請以官方為準)",
        stay_days: "—",
        process: "請至官方網站查詢或聯絡當地使領館。",
        documents: "請依官方要求準備。",
        fee: "—",
        official_link: ""
      };
    }
  }

  if (!found) {
    return res.status(404).json({ error: "country not found" });
  }

  res.json(found);
});

// ✔ 測試路由（你可保留或刪掉）
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// 啟動服務
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
