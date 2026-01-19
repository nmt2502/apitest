import express from "express";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

const API_GOC = "https://sunwinsaygex-pcl2.onrender.com/api/sun";
const STATE_FILE = "./state.json";

/* ================== LOAD / SAVE STATE ================== */

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      chuoi_cau: "",
      phien_hien_tai: 0,
      du_doan: "Chờ Đủ Dữ Liệu",
      do_tin_cay: "0%"
    };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let STATE = loadState();

/* ================== PATTERNS SUNWIN ================== */

const SUNWIN_PATTERNS = {
  "1-1": [
    { pattern: ["T","X","T","X"], probability: 0.7, strength: 0.8 },
    { pattern: ["X","T","X","T"], probability: 0.7, strength: 0.8 }
  ],

  "1-2-1": [
    { pattern: ["T","X","X","T"], probability: 0.65, strength: 0.75 },
    { pattern: ["X","T","T","X"], probability: 0.65, strength: 0.75 }
  ],

  "2-1-2": [
    { pattern: ["T","T","X","T","T"], probability: 0.68, strength: 0.78 },
    { pattern: ["X","X","T","X","X"], probability: 0.68, strength: 0.78 }
  ],

  "3-1": [
    { pattern: ["T","T","T","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","X","X","T"], probability: 0.72, strength: 0.82 }
  ],

  "1-3": [
    { pattern: ["T","X","X","X"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","T","T","T"], probability: 0.72, strength: 0.82 }
  ],

  "2-2": [
    { pattern: ["T","T","X","X"], probability: 0.66, strength: 0.76 },
    { pattern: ["X","X","T","T"], probability: 0.66, strength: 0.76 }
  ],

  "2-3": [
    { pattern: ["T","T","X","X","X"], probability: 0.71, strength: 0.81 },
    { pattern: ["X","X","T","T","T"], probability: 0.71, strength: 0.81 }
  ],

  "3-2": [
    { pattern: ["T","T","T","X","X"], probability: 0.73, strength: 0.83 },
    { pattern: ["X","X","X","T","T"], probability: 0.73, strength: 0.83 }
  ],

  "4-1": [
    { pattern: ["T","T","T","T","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","X","X","X","T"], probability: 0.76, strength: 0.86 }
  ],

  "1-4": [
    { pattern: ["T","X","X","X","X"], probability: 0.76, strength: 0.86 },
    { pattern: ["X","T","T","T","T"], probability: 0.76, strength: 0.86 }
  ],

  "3-1-3": [
    { pattern: ["T","T","T","X","T","T","T"], probability: 0.72, strength: 0.82 },
    { pattern: ["X","X","X","T","X","X","X"], probability: 0.72, strength: 0.82 }
  ],

  "2-3-2": [
    { pattern: ["T","T","X","X","X","T","T"], probability: 0.78, strength: 0.88 },
    { pattern: ["X","X","T","T","T","X","X"], probability: 0.78, strength: 0.88 }
  ]
};

/* ================== RUN ALGO ================== */

function runAlgo(chuoi_cau, PATTERNS = SUNWIN_PATTERNS) {
  // Chưa đủ dữ liệu
  if (!chuoi_cau || chuoi_cau.length < 4) {
    return {
      du_doan: "Chờ Đủ Dữ Liệu",
      do_tin_cay: "0%"
    };
  }

  let bestMatch = null;
  let bestLength = 0;

  // Duyệt toàn bộ thuật toán
  for (const key in PATTERNS) {
    for (const item of PATTERNS[key]) {
      const patternStr = item.pattern.join("");

      // So khớp đuôi chuỗi
      if (
        chuoi_cau.endsWith(patternStr) &&
        patternStr.length > bestLength
      ) {
        bestLength = patternStr.length;
        bestMatch = item;
      }
    }
  }

  // Không khớp cầu nào
  if (!bestMatch) {
    return {
      du_doan: "Chờ Đủ Dữ Liệu",
      do_tin_cay: "0%"
    };
  }

  /**
   * LOGIC DỰ ĐOÁN:
   * - Pattern kết thúc bằng T → đảo sang Xỉu
   * - Pattern kết thúc bằng X → đảo sang Tài
   */
  const lastChar = bestMatch.pattern[bestMatch.pattern.length - 1];
  const du_doan = lastChar === "T" ? "Xỉu" : "Tài";

  /**
   * ĐỘ TIN CẬY:
   * probability × strength × 100
   */
  const confidence = Math.round(
    bestMatch.probability * bestMatch.strength * 100
  );

  return {
    du_doan,
    do_tin_cay: `${confidence}%`
  };
}

/* ================== UPDATE DATA NGẦM ================== */

async function updateData() {
  try {
    const api = await fetch(API_GOC).then(r => r.json());

    // chỉ update khi có phiên mới
    if (!api || api.phien === STATE.phien) return;

    STATE.phien = api.phien;
    STATE.phien_hien_tai = api.phien_hien_tai;

    // xúc xắc (đúng key)
    STATE.xuc_xac1 = api.xuc_xac_1;
    STATE.xuc_xac2 = api.xuc_xac_2;
    STATE.xuc_xac3 = api.xuc_xac_3;

    STATE.tong = api.tong;
    STATE.ket_qua = api.ket_qua;

    // cập nhật chuỗi cầu
    const kq = api.ket_qua === "Tài" ? "T" : "X";
    STATE.chuoi_cau += kq;

    if (STATE.chuoi_cau.length > 100) {
      STATE.chuoi_cau = STATE.chuoi_cau.slice(-100);
    }

    // chạy thuật toán
    const algo = runAlgo(STATE.chuoi_cau);
    STATE.du_doan = algo.du_doan;
    STATE.do_tin_cay = algo.do_tin_cay;

    saveState(STATE);
    console.log("✔ Phiên:", api.phien, api.ket_qua, STATE.du_doan, STATE.do_tin_cay);

  } catch (err) {
    console.error("✖ Lỗi update:", err.message);
  }
}

/* ================== CHẠY NGẦM ================== */

setInterval(updateData, 5000);
updateData();

/* ================== API TRẢ JSON ================== */

app.get("/api/sunwin", (req, res) => {
  res.json({
    ID: "Bi Trùm Api",
    Game: "Sunwin",
    phien: STATE.phien_hien_tai,
    chuoi_cau: STATE.chuoi_cau,
    du_doan: STATE.du_doan,
    do_tin_cay: STATE.do_tin_cay
  });
});

/* ================== START SERVER ================== */

app.listen(PORT, () => {
  console.log("🚀 Sunwin API chạy tại port", PORT);
});
