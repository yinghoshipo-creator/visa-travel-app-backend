const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
// 正確定義 PORT，優先使用 Zeabur 環境變數
const port = process.env.PORT || 5001; 

// 啟用 CORS：允許來自任何網域的前端存取 API
app.use(cors());

let allVisas = []; // 用於儲存從 visa.json 載入的所有簽證數據
let availableRegions = [];

try {
    // 1. 嘗試載入 visa.json 檔案
    const rawData = require('./visa.json'); 

    // 核心修正區塊：處理載入的數據結構
    // 由於您的 visa.json 是國家物件的簡單陣列，我們直接使用它。
    if (Array.isArray(rawData)) {
        allVisas = rawData;
    } 
    // 保留對舊格式的兼容（如果存在）
    else if (rawData.data && typeof rawData.data === 'object') {
        allVisas = [
            ...(rawData.data.visa_free || []),
            ...(rawData.data.visa_on_arrival || []),
            ...(rawData.data.e_visa || [])
        ];
    } else {
        throw new Error("visa.json 結構無效。預期是一個國家陣列。");
    }

    if (allVisas.length === 0) {
        throw new Error("visa.json 結構錯誤或資料為空，請檢查國家陣列是否包含數據。");
    }

    // 3. 提取所有不重複的洲別清單
    // 您的 JSON 使用 "region" (小寫) 鍵名，這裡直接使用。
    availableRegions = [...new Set(allVisas.map(country => country.region).filter(r => r))];

    console.log(`✅ 簽證資料載入成功！總計國家數: ${allVisas.length}`);
    console.log(`✅ 偵測到地區數: ${availableRegions.length}`);
    
} catch (error) {
    console.error("==================================================");
    console.error("❌ 嚴重錯誤：無法載入或處理 visa.json 檔案！");
    console.error("請檢查以下兩點：1. 檔案路徑 (./visa.json) 2. JSON 格式是否有誤。");
    console.error("詳細錯誤訊息:", error.message);
    console.error("==================================================");
}


// --- API 路由定義區 ---

// 1. 核心路由： /api/visa?country=Japan (單一國家查詢)
app.get('/api/visa', (req, res) => {
    if (allVisas.length === 0) {
        return res.status(500).json({ error: "伺服器資料載入失敗，請檢查後端日誌(Log)。" });
    }

    const countryName = req.query.country; 
    
    if (!countryName) {
        return res.status(400).json({ error: '請提供國家名稱 (country)' });
    }
    
    const searchName = countryName.toLowerCase();
    
    // *** 修正：使用 JSON 內實際的鍵名 countryNameZh 和 countryNameEn 進行比對 ***
    const foundCountry = allVisas.find(country => 
        (country.countryNameZh && country.countryNameZh.toLowerCase() === searchName) ||
        (country.countryNameEn && country.countryNameEn.toLowerCase() === searchName)
    );

    if (!foundCountry) {
        return res.status(404).json({ error: `找不到國家: ${countryName}` });
    }
    
    // *** 修正：直接回傳 JSON 內實際的鍵名資料 ***
    res.json({
        countryName: foundCountry.countryNameZh, 
        requirement: foundCountry.visaType, 
        days: foundCountry.stayDays,
        process: foundCountry.process || '請參考官方網站',
        documents: foundCountry.documents || 'N/A',
        fee: foundCountry.fee || 'N/A',
        link: foundCountry.officialLink 
    });
});


// 2. 處理所有簽證資訊的 API 端點： /api/visas?region=亞太地區
app.get('/api/visas', (req, res) => {
    if (allVisas.length === 0) {
        return res.status(500).json({ error: "Server data failed to load from visa.json" });
    }
    
    const filterRegion = req.query.region;
    let filteredVisas = allVisas;

    if (filterRegion) {
        // 使用 'region' 鍵名進行過濾
        filteredVisas = allVisas.filter(country => 
            country.region === filterRegion
        );
    }
    
    // *** 修正：統一使用 JSON 內實際的鍵名進行回傳 ***
    const formattedVisas = filteredVisas.map(country => ({
        countryNameZh: country.countryNameZh,
        countryNameEn: country.countryNameEn,
        region: country.region, 
        visaType: country.visaType,
        stayDays: country.stayDays,
        requirementDetail: country.requirementDetail || 'N/A',
        officialLink: country.officialLink,
        notes: country.notes || 'N/A'
    }));
    
    res.json(formattedVisas);
});

// 3. 回傳所有國家/地區列表的 API： /api/countries
app.get('/api/countries', (req, res) => {
    if (allVisas.length === 0) {
        return res.status(500).json({ error: "Server data failed to load from visa.json" });
    }
    
    // *** 修正：使用 JSON 內實際的鍵名 countryNameZh 和 countryNameEn 進行映射 ***
    const countryList = allVisas.map(country => ({
        name_zh: country.countryNameZh, // 映射回 name_zh，以配合前端可能需要的命名
        name_en: country.countryNameEn, // 映射回 name_en
        region: country.region
    }));
    
    res.json(countryList);
});

// 4. 回傳所有地區列表的 API： /api/regions
app.get('/api/regions', (req, res) => {
    if (availableRegions.length === 0) {
        // 如果載入失敗，嘗試從 allVisas 再次計算，以防萬一
        if (allVisas.length > 0) {
             availableRegions = [...new Set(allVisas.map(country => country.region).filter(r => r))];
        } else {
            return res.status(500).json({ error: "Server data failed to load from visa.json" });
        }
    }
    res.json(availableRegions);
});


// 啟動伺服器
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});