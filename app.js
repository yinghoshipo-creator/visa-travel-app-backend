const express = require('express');
const app = express();
const port = 3000;

// 1. 載入新的 visa.json 檔案 (在新結構下)
const fullVisaData = require('./visa.json');

// 提取所有國家/地區的扁平化列表 (在應用程式啟動時只執行一次)
const allVisas = [
    ...fullVisaData.data.visa_free,
    ...fullVisaData.data.visa_on_arrival,
    ...fullVisaData.data.e_visa
];

// 2. 處理簽證資訊的 API 端點
// 範例 URL: /api/visas?region=亞太地區
app.get('/api/visas', (req, res) => {
    // 從查詢參數中取得 region (洲別)
    const filterRegion = req.query.region;
    
    let filteredVisas = allVisas;

    if (filterRegion) {
        // 如果有 region 參數，則進行篩選
        filteredVisas = allVisas.filter(country => 
            country.region === filterRegion
        );
    }
    
    // 3. 回傳篩選後的結果（如果沒有參數，則回傳全部）
    res.json(filteredVisas);
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
// ... (延續上面的程式碼) ...

// 提取所有不重複的洲別清單
const availableRegions = [...new Set(allVisas.map(country => country.region))];

app.get('/api/regions', (req, res) => {
    // 範例回傳: ["亞太地區", "亞西地區", "美洲地區", "歐洲地區 (申根區)", ...]
    res.json(availableRegions);
});