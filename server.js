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
      du_doan: "Chờ cầu",
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

const SUNWIN_PATTERNS = [
  { pattern: ["T","T","T"], probability: 0.75, strength: 0.9 },
  { pattern: ["X","X","X"], probability: 0.75, strength: 0.9 },
  { pattern: ["T","X","T","X"], probability: 0.72, strength: 0.85 },
  { pattern: ["X","T","X","T"], probability: 0.72, strength: 0.85 },
  { pattern: ["T","T","X","X"], probability: 0.7, strength: 0.8 },
  { pattern: ["X","X","T","T"], probability: 0.7, strength: 0.8 }
];

/* ================== RUN ALGO ================== */

function runAlgo(cau) {
  if (!cau || cau.length < 4) {
    return { du_doan: "Chờ cầu", do_tin_cay: "0%" };
  }

  let best = null;
  let bestLen = 0;

  for (const p of SUNWIN_PATTERNS) {
    const len = p.pattern.length;
    const tail = cau.slice(-len).split("").join("");

    if (tail === p.pattern.join("")) {
      if (!best || len > bestLen) {
        best = p;
        bestLen = len;
      }
    }
  }

  if (!best) {
    return { du_doan: "Chờ cầu", do_tin_cay: "0%" };
  }

  const last = best.pattern[best.pattern.length - 1];
  const du_doan = last === "T" ? "Xỉu" : "Tài";
  const percent = Math.round(best.probability * best.strength * 100);

  return {
    du_doan,
    do_tin_cay: percent + "%"
  };
}

/* ================== UPDATE DATA NGẦM ================== */

async function updateData() {
  try {
    const api = await fetch(API_GOC).then(r => r.json());

    if (!api || api.phien === STATE.phien_hien_tai) return;

    STATE.phien_hien_tai = api.phien;

    const kq = api.ket_qua === "Tài" ? "T" : "X";
    STATE.chuoi_cau += kq;

    if (STATE.chuoi_cau.length > 100) {
      STATE.chuoi_cau = STATE.chuoi_cau.slice(-100);
    }

    const algo = runAlgo(STATE.chuoi_cau);
    STATE.du_doan = algo.du_doan;
    STATE.do_tin_cay = algo.do_tin_cay;

    saveState(STATE);
    console.log("✔ Update phiên:", api.phien, "|", STATE.du_doan, STATE.do_tin_cay);
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
