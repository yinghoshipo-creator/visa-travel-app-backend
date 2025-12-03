const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
// 正確定義 PORT，優先使用 Zeabur 環境變數
const port = process.env.PORT || 5001; 

// 啟用 CORS：允許來自任何網域的前端存取 API
app.use(cors());

let allVisas = []; // 用於儲存從 visa.json 載入的所有簽證數據
let availableRegionsZh = []; // 儲存中文地區清單

try {
    // 1. 嘗試載入 visa.json 檔案
    const rawData = require('./visa.json'); 

    // 核心修正區塊：處理載入的數據結構
    // 由於您的 visa.json 是一個國家物件的扁平化陣列，我們直接使用它。
    if (Array.isArray(rawData)) {
        allVisas = rawData;
    } 
    // 保留對舊格式的兼容（如果存在），但強烈建議使用新的扁平陣列結構
    else if (rawData.data && Array.isArray(rawData.data)) {
        allVisas = rawData.data;
    } else {
        throw new Error("visa.json 結構無效。預期是一個國家物件的扁平陣列。");
    }

    if (allVisas.length === 0) {
        throw new Error("visa.json 結構錯誤或資料為空，請檢查國家陣列是否包含數據。");
    }

    // 3. 提取所有不重複的洲別清單 (使用 regionZh 進行中文地區名稱提取)
    availableRegionsZh = [...new Set(allVisas.map(country => country.regionZh).filter(r => r))];

    console.log(`✅ 簽證資料載入成功！總計國家數: ${allVisas.length}`);
    console.log(`✅ 偵測到地區數: ${availableRegionsZh.length}`);
    
} catch (error) {
    console.error("==================================================");
    console.error("❌ 嚴重錯誤：無法載入或處理 visa.json 檔案！");
    console.error("請檢查以下兩點：1. 檔案路徑 (./visa.json) 2. JSON 格式是否有誤。");
    console.error("詳細錯誤訊息:", error.message);
    console.error("==================================================");
}


// --- API 路由定義區 ---

// 1. 核心路由： /api/visa?country=日本 (單一國家查詢)
app.get('/api/visa', (req, res) => {
    if (allVisas.length === 0) {
        return res.status(500).json({ error: "伺服器資料載入失敗，請檢查後端日誌(Log)。" });
    }

    const countryName = req.query.country; 
    
    if (!countryName) {
        return res.status(400).json({ error: '請提供國家名稱 (country)' });
    }
    
    const searchName = countryName.toLowerCase().trim();
    
    // 使用 JSON 內實際的鍵名 countryNameZh 和 countryNameEn 進行比對
    const foundCountry = allVisas.find(country => 
        (country.countryNameZh && country.countryNameZh.toLowerCase().trim() === searchName) ||
        (country.countryNameEn && country.countryNameEn.toLowerCase().trim() === searchName)
    );

    if (!foundCountry) {
        return res.status(404).json({ error: `找不到國家: ${countryName}` });
    }
    
    // 映射到新的 JSON 鍵名
    res.json({
        countryName: foundCountry.countryNameZh, 
        // 舊的 'requirement' 映射到新的 'visaType'
        requirement: foundCountry.visaType, 
        // 舊的 'days' 映射到新的 'stayDays'
        days: foundCountry.stayDays,
        // 舊的詳細資訊欄位 (process/documents/fee/link) 映射到新的 notesZh 或 N/A
        process: foundCountry.notesZh, 
        documents: foundCountry.notesZh.includes('須事先線上申請') ? foundCountry.notesZh : 'N/A', // 嘗試從 notesZh 提取資訊
        fee: 'N/A', 
        link: 'N/A' 
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
        // 使用 'regionZh' 鍵名進行過濾 (中文地區名稱)
        filteredVisas = allVisas.filter(country => 
            country.regionZh === filterRegion
        );
    }
    
    // 統一使用 JSON 內實際的鍵名進行回傳
    const formattedVisas = filteredVisas.map(country => ({
        countryId: country.countryId, // 新增 countryId
        countryNameZh: country.countryNameZh,
        countryNameEn: country.countryNameEn,
        regionZh: country.regionZh, // 使用 regionZh
        regionEn: country.regionEn, // 使用 regionEn
        visaType: country.visaType,
        stayDays: country.stayDays,
        notesZh: country.notesZh, // 映射詳細說明
        notesEn: country.notesEn // 映射英文詳細說明
    }));
    
    res.json(formattedVisas);
});

// 3. 回傳所有國家/地區列表的 API： /api/countries
app.get('/api/countries', (req, res) => {
    if (allVisas.length === 0) {
        return res.status(500).json({ error: "Server data failed to load from visa.json" });
    }
    
    // 使用 JSON 內實際的鍵名 countryNameZh 和 countryNameEn 進行映射
    const countryList = allVisas.map(country => ({
        name_zh: country.countryNameZh, 
        name_en: country.countryNameEn, 
        region_zh: country.regionZh, // 映射為 region_zh
        region_en: country.regionEn  // 映射為 region_en
    }));
    
    res.json(countryList);
});

// 4. 回傳所有地區列表的 API： /api/regions
app.get('/api/regions', (req, res) => {
    if (availableRegionsZh.length === 0) {
        // 如果載入失敗，嘗試從 allVisas 再次計算，以防萬一
        if (allVisas.length > 0) {
             availableRegionsZh = [...new Set(allVisas.map(country => country.regionZh).filter(r => r))];
        } else {
            return res.status(500).json({ error: "Server data failed to load from visa.json" });
        }
    }
    // 回傳中文地區清單
    res.json(availableRegionsZh);
});


// 啟動伺服器
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});