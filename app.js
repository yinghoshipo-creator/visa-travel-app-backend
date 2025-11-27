// app.js - 簡單 Express API for Zeabur
// 使用方法：node app.js
// 簡易路由：GET /api/countries  -> 回傳名單
//           GET /api/visa/:country -> 查國家簽證（支援 code / 英文或中文名稱）

const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

// 允許跨域（CORS）給前端使用 GitHub Pages
app.use((req,res,next)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  next();
});

const DATA_DIR = __dirname;
const COUNTRIES_FILE = path.join(DATA_DIR,"countries.json");
const VISA_FILE = path.join(DATA_DIR,"visa.json");

function readJSON(filePath){
  try{
    const raw = fs.readFileSync(filePath,"utf8");
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}

// GET /api/countries
app.get("/api/countries", (req,res) => {
  const list = readJSON(COUNTRIES_FILE);
  if(!list) return res.status(500).json({error:"cannot read countries"});
  res.json(list);
});

// GET /api/visa/:country
app.get("/api/visa/:country", (req,res) => {
  const q = req.params.country.toLowerCase();
  const visaList = readJSON(VISA_FILE) || [];
  const countries = readJSON(COUNTRIES_FILE) || [];

  // 先嘗試以 code 精準比對 (JP/TW/US etc.)
  let found = visaList.find(v => (v.code || "").toLowerCase() === q);

  if(!found){
    // 嘗試 name 英文 / 中文
    found = visaList.find(v => (v.name || "").toLowerCase() === q);
  }
  if(!found){
    // 嘗試 countries.json 來找 code (使用者輸入中文或英文)
    const c = countries.find(c =>
      (c.name_en || "").toLowerCase() === q ||
      (c.name_zh || "").toLowerCase() === q ||
      (c.code || "").toLowerCase() === q
    );
    if(c){
      // 找到國家但 visa.json 沒有詳細資料 -> 回傳一個偽資料模板（提醒為假資料）
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

  if(!found){
    return res.status(404).json({error:"country not found"});
  }

  res.json(found);
});

// 啟動服務（Zeabur 會自動指定 PORT）
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
