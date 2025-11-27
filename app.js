const express = require('express');
const app = express();
const port = 5001;
// 1. 引入 cors
const cors = require('cors'); 

// 2. 在所有路由定義之前使用 cors
// 這將允許所有來源 (origin) 存取您的 API
app.use(cors());

let fullVisaData = {};
let allVisas = [];
let availableRegions = [];

try {
    // 1. 嘗試載入新的 visa.json 檔案
    fullVisaData = require('./visa.json');

    // 2. 嘗試處理資料 (如果 visa.json 結構不對，這裡會拋出 TypeError)
    allVisas = [
        // 確保 fullVisaData.data 存在
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
    console.error("請檢查以下兩點：");
    console.error("1. 檔案路徑是否正確 (./visa.json)");
    console.error("2. **visa.json 檔案的 JSON 格式是否有誤或結構不符** (這是最常見的問題)");
    console.error("詳細錯誤訊息:", error.message);
    console.error("==================================================");
}


// --- API 路由定義區 ---

// 處理所有簽證資訊的 API 端點
app.get('/api/visas', (req, res) => {
    // 如果資料載入失敗，我們回傳空陣列
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

// 回傳所有國家/地區列表的 API
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

// 回傳所有地區列表的 API (用於下拉式選單)
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