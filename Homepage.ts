// --- GLOBAL INTERFACES & TYPES ---
interface Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

type SupportedLang = "en" | "ceb";

// --- CONFIGURATION & STATE ---
const CHAT_WEATHER_API_KEY: string = "f807f8e4da415c3094ba3d2a9e39d200";
const CHAT_WEATHER_CITY: string = "Davao,PH";

const ADMIN_TOKEN_KEY: string = "mycalinan_admin_token";
const ADMIN_USERNAME_KEY: string = "mycalinan_admin_username";
const PROTECTED_TERMS: Record<string, string> = {
  "Calinan": "__CALINAN__",
  "MyCalinan": "__MYCALINAN__",
  "Davao": "__DAVAO__"
};

let currentLang: SupportedLang = "en";
let stopRequested: boolean = false;
let isBotTyping: boolean = false;
let currentRequestId: number = 0;
let typingTimer: ReturnType<typeof setTimeout> | null = null;
let activeController: AbortController | null = null;

let voiceEnabled: boolean = localStorage.getItem("calibotVoiceEnabled") !== "false";
let availableVoices: SpeechSynthesisVoice[] = [];
let recognition: any = null;
let isListening: boolean = false;

const originalTexts: Map<Element, string> = new Map();

/* ============= CHATBOT WEATHER LOOKUP ============= */
function isWeatherQuery(text: string): boolean {
  const weatherWords: string[] = [
    "weather", "forecast", "temperature", "climate", "rain", "rainy",
    "panahon", "klima", "init", "bugnaw", "ulan", "unsaon ang panahon"
  ];
  return weatherWords.some(word => new RegExp(`\\b${word}\\b`, "i").test(text));
}

async function fetchWeatherForChat(signal: AbortSignal): Promise<string> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${CHAT_WEATHER_CITY}&units=metric&appid=${CHAT_WEATHER_API_KEY}`,
      { signal }
    );
    const data = await res.json();

    if (!res.ok || !data.main || !data.weather) {
      return "Sorry, I could not fetch the weather right now. Please try again later. 🌥";
    }

    const temp = Math.round(data.main.temp);
    const feels = Math.round(data.main.feels_like);
    const condition = data.weather[0].description;
    const humidity = data.main.humidity;
    const windKph = Math.round(data.wind.speed * 3.6);

    return `Here's today's weather in ${data.name}:<br><br>` +
      `🌡 <b>Temperature:</b> ${temp}°C (feels like ${feels}°C)<br>` +
      `☁️ <b>Condition:</b> ${condition}<br>` +
      `💧 <b>Humidity:</b> ${humidity}%<br>` +
      `🌬 <b>Wind:</b> ${windKph} km/h`;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    console.error("Chatbot weather error:", error);
    return "Sorry, I could not fetch the weather right now. Please try again later. 🌥";
  }
}

/* ============= ADMIN SESSION AWARENESS ============= */
function getAdminToken(): string {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function getAdminUsername(): string {
  return localStorage.getItem(ADMIN_USERNAME_KEY) || sessionStorage.getItem(ADMIN_USERNAME_KEY) || "Admin";
}

function updateAuthUI(): void {
  const authArea = document.getElementById("authArea") as HTMLDivElement | null;
  const authBtn = document.getElementById("authBtn") as HTMLButtonElement | null;
  const dropdown = document.getElementById("adminDropdown") as HTMLDivElement | null;
  const dropdownHeader = document.getElementById("adminDropdownHeader") as HTMLDivElement | null;
  
  if (!authArea || !authBtn) return;

  if (getAdminToken()) {
    authArea.classList.add("logged-in");
    authBtn.textContent = `👤 ${getAdminUsername()}`;
    authBtn.onclick = (e: MouseEvent) => { e.stopPropagation(); toggleAdminDropdown(); };
    if (dropdownHeader) dropdownHeader.textContent = `Signed in as ${getAdminUsername()}`;
  } else {
    authArea.classList.remove("logged-in", "open");
    authBtn.textContent = "Login";
    authBtn.onclick = () => { window.location.href = "Admin-login.html"; };
    if (dropdown) dropdown.classList.remove("open");
  }
}

function toggleAdminDropdown(): void {
  const dropdown = document.getElementById("adminDropdown") as HTMLDivElement | null;
  const authArea = document.getElementById("authArea") as HTMLDivElement | null;
  if (dropdown) dropdown.classList.toggle("open");
  if (authArea) authArea.classList.toggle("open");
}

function adminLogout(e?: Event): void {
  if (e) e.preventDefault();
  [localStorage, sessionStorage].forEach(store => {
    store.removeItem(ADMIN_TOKEN_KEY);
    store.removeItem(ADMIN_USERNAME_KEY);
    store.removeItem("mycalinan_admin_role");
  });
  updateAuthUI();
}

window.addEventListener("click", (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest("#authArea")) {
    document.getElementById("adminDropdown")?.classList.remove("open");
    document.getElementById("authArea")?.classList.remove("open");
  }
});

/* ============= VOICE OUTPUT (Text to Speech) ============= */
function loadVoices(): void {
  availableVoices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
}

if (window.speechSynthesis) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function stripHtmlForSpeech(html: string): string {
  const temp = document.createElement("div");
  temp.innerHTML = String(html || "");
  let text = temp.textContent || temp.innerText || "";
  text = text.replace(/\p{Extended_Pictographic}/gu, "");
  text = text.replace(/[\uFE0F\u200D\u20E3]/g, "");
  return text.replace(/\s{2,}/g, " ").trim();
}

function pickVoice(lang: SupportedLang): SpeechSynthesisVoice | undefined {
  if (!availableVoices.length) return undefined;
  const preferredCodes = lang === "ceb" ? ["fil-PH", "fil", "tl-PH", "en-PH", "en-US"] : ["en-PH", "en-US", "en-GB", "en"];
  for (const code of preferredCodes) {
    const match = availableVoices.find(v => v.lang && v.lang.toLowerCase().startsWith(code.toLowerCase()));
    if (match) return match;
  }
  return availableVoices[0];
}

function speakText(htmlText: string): void {
  if (!voiceEnabled || !window.speechSynthesis) return;
  const plainText = stripHtmlForSpeech(htmlText).trim();
  if (plainText === "") return;

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(plainText);
  const voice = pickVoice(currentLang);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = currentLang === "ceb" ? "fil-PH" : "en-US";
  }

  utterance.rate = 1;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

function toggleVoice(): void {
  voiceEnabled = !voiceEnabled;
  localStorage.setItem("calibotVoiceEnabled", voiceEnabled ? "true" : "false");
  if (!voiceEnabled && window.speechSynthesis) speechSynthesis.cancel();
  updateVoiceButton();
}

function updateVoiceButton(): void {
  const btn = document.getElementById("voice-toggle-btn") as HTMLButtonElement | null;
  if (!btn) return;
  btn.textContent = voiceEnabled ? "🔊" : "🔇";
  btn.title = voiceEnabled ? "Voice replies: ON (click to mute)" : "Voice replies: OFF (click to unmute)";
}

/* ============= VOICE INPUT (Speech to Text) ============= */
function getSpeechRecognition(): any {
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SpeechRecognitionAPI ? new SpeechRecognitionAPI() : null;
}

function micLangCode(lang: SupportedLang): string {
  return lang === "ceb" ? "fil-PH" : "en-US";
}

async function startListening(): Promise<void> {
  if (isListening) return;
  recognition = getSpeechRecognition();

  if (!recognition) {
    let msg = "⚠️ Sorry, voice input isn't supported in this browser. Please try Chrome.";
    if (currentLang !== "en") msg = await translateText(msg);
    addBotMessage(msg, 10, true);
    return;
  }

  if (window.speechSynthesis) speechSynthesis.cancel();

  recognition.lang = micLangCode(currentLang);
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const micBtn = document.getElementById("mic-btn") as HTMLButtonElement | null;

  recognition.onstart = () => {
    isListening = true;
    if (micBtn) micBtn.classList.add("listening");
  };

  recognition.onresult = (event: any) => {
    const transcript: string = event.results[0][0].transcript;
    const input = document.getElementById("chatbot-input") as HTMLInputElement | null;
    if (input && transcript.trim() !== "") {
      input.value = transcript;
      sendMessage();
    }
  };

  recognition.onerror = async (event: any) => {
    let msg = "";
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      msg = "⚠️ Microphone access was blocked. Please allow mic permission and try again.";
    } else if (event.error !== "no-speech" && event.error !== "aborted") {
      msg = "⚠️ Sorry, I couldn't hear that clearly. Please try again.";
    }
    if (msg) {
      if (currentLang !== "en") msg = await translateText(msg);
      addBotMessage(msg, 10, true);
    }
  };

  recognition.onend = () => {
    isListening = false;
    if (micBtn) micBtn.classList.remove("listening");
    recognition = null;
  };

  recognition.start();
}

function stopListening(): void {
  if (recognition) recognition.stop();
}

(window as any).toggleMic = function(): void {
  if (isListening) stopListening();
  else startListening();
};

/* ============= TRANSLATION LOGIC ============= */
async function changeLanguage(lang: SupportedLang): Promise<void> {
  currentLang = lang;
  localStorage.setItem("siteLang", lang);
  fixCebuanoLabels();
  await translatePage(lang);
}
(window as any).changeLanguage = changeLanguage;

function saveOriginalTexts(): void {
  document.querySelectorAll("h1, h2, h3, p, span, a").forEach((el: Element) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.closest(".no-translate") || htmlEl.closest("#chatbot-container")) return;
    if (htmlEl.children.length > 0 && htmlEl.tagName !== "A") return;
    
    if (!originalTexts.has(htmlEl)) {
      originalTexts.set(htmlEl, htmlEl.innerText);
    }
  });
}

async function translatePage(lang: SupportedLang): Promise<void> {
  saveOriginalTexts();
  if (lang === "en") {
    originalTexts.forEach((text, el) => {
      (el as HTMLElement).innerText = text;
    });
    return;
  }

  const elements: HTMLElement[] = [];
  const texts: string[] = [];

  originalTexts.forEach((text, el) => {
    if (text.trim() !== "") {
      elements.push(el as HTMLElement);
      texts.push(text);
    }
  });

  const translated = await translateTexts(texts);
  translated.forEach((text, i) => {
    if (elements[i]) elements[i].innerText = text;
  });
}

function protectText(text: string): string {
  let protectedText = String(text || "");
  Object.keys(PROTECTED_TERMS).forEach(term => {
    protectedText = protectedText.replaceAll(term, PROTECTED_TERMS[term]);
  });
  return protectedText;
}

function restoreText(text: string): string {
  let restoredText = String(text || "");
  Object.keys(PROTECTED_TERMS).forEach(term => {
    restoredText = restoredText.replaceAll(PROTECTED_TERMS[term], term);
  });
  return restoredText.replaceAll("Kalye", "Calinan").replaceAll("kalye", "Calinan");
}

function truncateForCache(text: string): string {
  return text.length > 450 ? text.slice(0, 450) + "..." : text;
}

async function translateTexts(texts: string[]): Promise<string[]> {
  if (currentLang === "en") return texts;

  const results: string[] = new Array(texts.length).fill("");
  const missing: string[] = [];
  const missingIndex: number[] = [];

  texts.forEach((text, index) => {
    const cleanText = String(text || "").trim();
    if (cleanText === "") return;

    const shortText = truncateForCache(cleanText);
    const cacheKey = `${currentLang}_${shortText}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      results[index] = cached;
    } else {
      missing.push(protectText(shortText));
      missingIndex.push(index);
    }
  });

  if (missing.length > 0) {
    try {
      const res = await fetch("http://localhost:5000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: missing, target: currentLang })
      });
      const data = await res.json();
      const translatedList: string[] = data.translated || missing;

      translatedList.forEach((translated, i) => {
        const originalIndex = missingIndex[i];
        const fixedText = restoreText(translated);
        results[originalIndex] = fixedText;
        localStorage.setItem(`${currentLang}_${truncateForCache(texts[originalIndex])}`, fixedText);
      });
    } catch (error) {
      console.error("Translation error:", error);
      missing.forEach((text, i) => {
        results[missingIndex[i]] = restoreText(text);
      });
    }
  }
  return results;
}

async function translateText(text: string): Promise<string> {
  const translated = await translateTexts([text]);
  return translated[0];
}

function fixCebuanoLabels(): void {
  const chatbotLabel = document.getElementById("chatbot-label") as HTMLDivElement | null;
  if (chatbotLabel) chatbotLabel.innerText = currentLang === "ceb" ? "Isturya sa AI" : "Talk to AI";

  document.querySelectorAll(".suggestion-chip").forEach((chip: Element) => {
    const htmlChip = chip as HTMLElement;
    const label = currentLang === "ceb" ? htmlChip.dataset.labelCeb : htmlChip.dataset.labelEn;
    if (label) htmlChip.innerText = label;
  });
}

/* ============= MENU ============= */
(window as any).toggleMenu = function(id: string): void {
  const menu = document.getElementById(id) as HTMLDivElement | null;
  if (!menu) return;
  
  document.querySelectorAll(".dropdown-content").forEach((el: Element) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.id !== id) htmlEl.style.display = "none";
  });
  menu.style.display = menu.style.display === "block" ? "none" : "block";
};

window.addEventListener("click", (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest("button") && !target.closest(".dropdown-content")) {
    document.querySelectorAll(".dropdown-content").forEach((el: Element) => {
      (el as HTMLElement).style.display = "none";
    });
  }
});

/* ============= CHATBOT CORE ============= */
(window as any).toggleChatbot = function(): void {
  document.getElementById("chatbot-box")?.classList.toggle("active");
};

function scrollMessages(): void {
  const messages = document.getElementById("chatbot-messages") as HTMLDivElement | null;
  if (messages) messages.scrollTop = messages.scrollHeight;
}

function stopTypingTimer(): void {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
}

function typeMessage(element: HTMLElement, htmlText: string, speed: number = 12, onDone: (() => void) | null = null): void {
  let i = 0;
  let temp = "";
  stopTypingTimer();

  function type(): void {
    if (stopRequested) {
      element.innerHTML = temp;
      stopTypingTimer();
      if (onDone) onDone();
      return;
    }

    if (i < htmlText.length) {
      if (htmlText.charAt(i) === "<") {
        let tag = "";
        while (htmlText.charAt(i) !== ">" && i < htmlText.length) {
          tag += htmlText.charAt(i);
          i++;
        }
        tag += ">";
        temp += tag;
      } else {
        temp += htmlText.charAt(i);
      }
      
      element.innerHTML = temp;
      scrollMessages();
      i++;
      typingTimer = setTimeout(type, speed);
    } else {
      isBotTyping = false;
      stopTypingTimer();
      if (onDone) onDone();
    }
  }

  isBotTyping = true;
  type();
}

function addBotMessage(htmlText: string, speed: number = 12, useVoice: boolean = false): void {
  const messagesContainer = document.getElementById("chatbot-messages") as HTMLDivElement | null;
  if (!messagesContainer) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = "bot-message";
  messagesContainer.appendChild(msgDiv);
  scrollMessages();

  typeMessage(msgDiv, htmlText, speed, () => {
    if (useVoice) speakText(htmlText);
  });
}

function addUserMessage(text: string): void {
  const messagesContainer = document.getElementById("chatbot-messages") as HTMLDivElement | null;
  if (!messagesContainer) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = "user-message";
  msgDiv.innerText = text;
  messagesContainer.appendChild(msgDiv);
  scrollMessages();
}

(window as any).sendMessage = async function(): Promise<void> {
  const inputEl = document.getElementById("chatbot-input") as HTMLInputElement | null;
  if (!inputEl) return;

  let text = inputEl.value.trim();
  if (!text || isBotTyping) return;

  inputEl.value = "";
  stopRequested = false;
  currentRequestId++;
  const reqId = currentRequestId;

  addUserMessage(text);
  
  if (activeController) activeController.abort();
  activeController = new AbortController();
  const signal = activeController.signal;

  const messagesContainer = document.getElementById("chatbot-messages") as HTMLDivElement | null;
  if (messagesContainer) {
    const typingDiv = document.createElement("div");
    typingDiv.className = "bot-message typing-indicator";
    typingDiv.id = `bot-typing-${reqId}`;
    typingDiv.innerHTML = "<em>Typing...</em>";
    messagesContainer.appendChild(typingDiv);
    scrollMessages();
  }

  try {
    let responseHtml = "";
    
    if (isWeatherQuery(text)) {
      responseHtml = await fetchWeatherForChat(signal);
    } else {
      // Placeholder for your backend AI fetch logic
      responseHtml = "I'm Calibot! I'm currently in development, but soon I'll be able to answer all your questions about Calinan. 🦅";
      if (currentLang !== "en") {
        responseHtml = await translateText(responseHtml);
      }
    }

    if (stopRequested || reqId !== currentRequestId) return;

    document.getElementById(`bot-typing-${reqId}`)?.remove();
    addBotMessage(responseHtml, 12, true);

  } catch (error: unknown) {
    if (error instanceof Error && error.name !== "AbortError") {
      document.getElementById(`bot-typing-${reqId}`)?.remove();
      let errorMsg = "Oops! Something went wrong reaching the server.";
      if (currentLang !== "en") errorMsg = await translateText(errorMsg);
      addBotMessage(errorMsg, 12, false);
    }
  }
};

(window as any).quickAsk = function(btnElement: HTMLElement): void {
  const query = currentLang === "ceb" ? btnElement.dataset.queryCeb : btnElement.dataset.queryEn;
  const inputEl = document.getElementById("chatbot-input") as HTMLInputElement | null;
  if (inputEl && query) {
    inputEl.value = query;
    (window as any).sendMessage();
  }
};

(window as any).stopBot = function(): void {
  stopRequested = true;
  if (activeController) activeController.abort();
  if (window.speechSynthesis) speechSynthesis.cancel();
  
  document.querySelectorAll(".typing-indicator").forEach(el => el.remove());
  isBotTyping = false;
};

// Enter key submit
document.getElementById("chatbot-input")?.addEventListener("keypress", (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
    (window as any).sendMessage();
  }
});

/* ============= INITIALIZATION ============= */
document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  updateVoiceButton();

  const savedLang = (localStorage.getItem("siteLang") as SupportedLang) || "en";
  const switcher = document.getElementById("languageSwitcher") as HTMLSelectElement | null;
  if (switcher) switcher.value = savedLang;
  if (savedLang !== "en") changeLanguage(savedLang);
});
