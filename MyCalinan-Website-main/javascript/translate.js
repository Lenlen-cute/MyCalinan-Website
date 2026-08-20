let currentLang = "en";

const originalTexts = new Map();

const PROTECTED_TERMS = {
  "Calinan": "__CALINAN__",
  "MyCalinan": "__MYCALINAN__",
  "Davao": "__DAVAO__"
};

async function changeLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("siteLang", lang);
  await translatePage(lang);
}

// SAVE ORIGINAL TEXTS
function saveOriginalTexts() {
  document.querySelectorAll("h1, h2, h3, p, span, a").forEach(el => {
    if (el.closest(".no-translate")) return;
    if (el.closest("#chatbot-container")) return;

    if (el.children.length > 0 && el.tagName !== "A") return;

    if (!originalTexts.has(el)) {
      originalTexts.set(el, el.innerText);
    }
  });
}

// MAIN TRANSLATION
async function translatePage(lang) {
  saveOriginalTexts();

  if (lang === "en") {
    originalTexts.forEach((text, el) => {
      el.innerText = text;
    });
    return;
  }

  const elements = [];
  const texts = [];

  originalTexts.forEach((text, el) => {
    if (text.trim() !== "") {
      elements.push(el);
      texts.push(text);
    }
  });

  const translated = await translateTexts(texts);

  translated.forEach((text, i) => {
    if (elements[i]) {
      elements[i].innerText = text;
    }
  });
}

// PROTECT CALINAN
function protectText(text) {
  let protectedText = String(text || "");
  Object.keys(PROTECTED_TERMS).forEach(term => {
    protectedText = protectedText.replaceAll(term, PROTECTED_TERMS[term]);
  });
  return protectedText;
}

function restoreText(text) {
  let restoredText = String(text || "");
  Object.keys(PROTECTED_TERMS).forEach(term => {
    restoredText = restoredText.replaceAll(PROTECTED_TERMS[term], term);
  });

  return restoredText;
}

// CALL FLASK TRANSLATE API
async function translateTexts(texts) {
  if (currentLang === "en") return texts;

  try {
    const res = await fetch("http://localhost:5000/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        texts: texts.map(t => protectText(t)),
        target: currentLang
      })
    });

    const data = await res.json();

    return (data.translated || texts).map(t => restoreText(t));

  } catch (error) {
    console.error("Translation error:", error);
    return texts;
  }
}

// LOAD LANGUAGE ON PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("siteLang") || "en";
  currentLang = savedLang;

  const switcher = document.getElementById("languageSwitcher");
  if (switcher) switcher.value = savedLang;

  if (savedLang !== "en") {
    translatePage(savedLang);
  }
});