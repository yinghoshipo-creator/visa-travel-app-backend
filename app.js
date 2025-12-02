const express = require('express');
const cors = require('cors'); // 確保引入 CORS
const app = express();
const port = process.env.PORT || 5001; // 正確定義 PORT，優先使用 Zeabur 環境變數

// 啟用 CORS：允許來自任何網域的前端存取 API
app.use(cors());

let fullVisaData = {};
let allVisas = [];
let availableRegions = [];

try {
    // 1. 嘗試載入 visa.json 檔案
    fullVisaData = require('./visa.json');

    // 2. 嘗試處理資料，將所有簽證類型的國家資料合併到 allVisas 陣列
    allVisas = [
        ...(fullVisaData.data?.visa_free || []),
        ...(fullVisaData.data?.visa_on_arrival || []),
        ...(fullVisaData.data?.e_visa || [])
    ];
    
    if (allVisas.length === 0) {
        throw new Error("visa.json 結構錯誤或資料為空，請檢查 'data' 物件內的三個簽證陣列。");
    }

    // 3. 提取所有不重複的洲別清單
    availableRegions = [...new Set(allVisas.map(country => country.region))];

    console.log(`✅ 簽證資料載入成功！總計國家數: ${allVisas.length}`);
    console.log(`✅ 偵測到地區數: ${availableRegions.length}`);
    
} catch (error) {
    console.error("==================================================");
    console.error("❌ 嚴重錯誤：無法載入或處理 visa.json 檔案！");
    console.error("請檢查以下兩點：1. 檔案路徑 (./visa.json) 2. JSON 格式是否有誤。");
    console.error("詳細錯誤訊息:", error.message);
    console.error("==================================================");
    // 這裡不 return，讓伺服器嘗試啟動，但 API 會回傳 500 錯誤。
}


// --- API 路由定義區 ---

// 核心修正：新增 /api/visa 路由，用於前端單一國家查詢
// 路徑： /api/visa?country=Japan
app.get('/api/visa', (req, res) => {
    // 檢查資料是否成功載入
    if (allVisas.length === 0) {
        return res.status(500).json({ error: "伺服器資料載入失敗，請檢查後端日誌(Log)。" });
    }

    const countryName = req.query.country; 
    
    if (!countryName) {
        return res.status(400).json({ error: '請提供國家名稱 (country)' });
    }
    
    // 支援中文或英文查詢
    const searchName = countryName.toLowerCase();
    const foundCountry = allVisas.find(country => 
        country.name_zh.toLowerCase() === searchName ||
        country.name_en.toLowerCase() === searchName
    );

    if (!foundCountry) {
        return res.status(404).json({ error: `找不到國家: ${countryName}` });
    }
    
    // 成功回傳該國家的簽證資料，鍵名與前端 script.js 期望的名稱一致
    res.json({
        countryName: foundCountry.name_zh, 
        // 假設您的資料中包含這些鍵名 (請與 visa.json 結構確認)
        requirement: foundCountry.visa_type || 'N/A', 
        days: foundCountry.stay_days || 'N/A',
        process: foundCountry.process || '請參考官方網站',
        documents: foundCountry.documents || 'N/A',
        fee: foundCountry.fee || 'N/A',
        link: foundCountry.official_link // 假設資料中包含 official_link
    });
});


// 處理所有簽證資訊的 API 端點 (原有的)
app.get('/api/visas', (req, res) => {
    if (allVisas.length === 0) {
        return res.status(500).json({ error: "Server data failed to load from visa.json" });
    }
    
    const filterRegion = req.query.region;
    let filteredVisas = allVisas;

    if (filterRegion) {
        filteredVisas = allVisas.filter(country => 
            country.region === filterRegion
        );
    }
    
    res.json(filteredVisas);
});

// 回傳所有國家/地區列表的 API (原有的)
app.get('/api/countries', (req, res) => {
    if (allVisas.length === 0) {
        return res.status(500).json({ error: "Server data failed to load from visa.json" });
    }
    
    const countryList = allVisas.map(country => ({
        name_zh: country.name_zh,
        name_en: country.name_en,
        region: country.region
    }));
    
    res.json(countryList);
});

// 回傳所有地區列表的 API (原有的)
app.get('/api/regions', (req, res) => {
    if (availableRegions.length === 0) {
        return res.status(500).json({ error: "Server data failed to load from visa.json" });
    }
    res.json(availableRegions);
});


// 啟動伺服器
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});