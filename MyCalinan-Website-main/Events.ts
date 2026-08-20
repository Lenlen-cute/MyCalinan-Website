/* ══════════════════════════════════════════
   INTERFACES
══════════════════════════════════════════ */
interface EventItem {
  id?: string | number;
  name?: string;
  title?: string;
  image?: string;
  category?: string;
  date?: string;
  location?: string;
  description?: string;
}

/* ══════════════════════════════════════════
   CONSTANTS & GLOBALS
══════════════════════════════════════════ */
const API_URL: string = "http://localhost:5000/api/events";

/* ══════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════ */
function escapeHtml(text: any): string {
  if (text == null) return "";

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCategoryClass(category: string | undefined): string {
  const c: string = (category || "").toLowerCase();

  if (c.includes("event")) return "event";
  if (c.includes("festival")) return "festival";
  if (c.includes("program")) return "program";
  if (c.includes("advisory")) return "advisory";

  return "general";
}

/* ══════════════════════════════════════════
   CORE LOGIC
══════════════════════════════════════════ */
async function loadEvents(): Promise<void> {
  const container = document.getElementById("eventsContainer") as HTMLElement;
  if (!container) return;

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const events: EventItem[] = await response.json();

    if (!events || events.length === 0) {
      container.innerHTML = `
        <div class="empty">
          No events available.
        </div>
      `;
      return;
    }

    let eventCount: number = 0;
    let festivalCount: number = 0;
    let advisoryCount: number = 0;

    let html: string = `<div class="events-grid">`;

    events.forEach((item: EventItem) => {
      const category: string = item.category || "General";
      const lower: string = category.toLowerCase();

      if (lower.includes("event")) eventCount++;
      if (lower.includes("festival")) festivalCount++;
      if (lower.includes("advisory")) advisoryCount++;

      const imageHtml: string = item.image
        ? `<img src="${item.image}" alt="${escapeHtml(item.name || item.title)}">`
        : "";

      const locationHtml: string = item.location
        ? `
          <div class="meta">
              <p>
                  <i class="fas fa-map-marker-alt"></i>
                  ${escapeHtml(item.location)}
              </p>
          </div>
          `
        : "";

      html += `
        <div class="card">
            ${imageHtml}
            <div class="card-body">
                <span class="badge ${getCategoryClass(category)}">
                    ${escapeHtml(category)}
                </span>
                <div class="title">
                    ${escapeHtml(item.name || item.title || "Untitled Event")}
                </div>
                <div class="meta">
                    <p>
                        <i class="fas fa-calendar"></i>
                        ${escapeHtml(item.date || "No date")}
                    </p>
                </div>
                ${locationHtml}
                <div class="description">
                    ${escapeHtml(item.description || "")}
                </div>
            </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Safely update DOM stats
    const totalEventsEl = document.getElementById("totalEvents");
    const eventCountEl = document.getElementById("eventCount");
    const festivalCountEl = document.getElementById("festivalCount");
    const advisoryCountEl = document.getElementById("advisoryCount");

    if (totalEventsEl) totalEventsEl.textContent = events.length.toString();
    if (eventCountEl) eventCountEl.textContent = eventCount.toString();
    if (festivalCountEl) festivalCountEl.textContent = festivalCount.toString();
    if (advisoryCountEl) advisoryCountEl.textContent = advisoryCount.toString();

  } catch (error) {
    console.error("Failed to load events:", error);
    container.innerHTML = `
      <div class="empty">
          ⚠️ Unable to load events.<br>
          Make sure Flask is running on port 5000.
      </div>
    `;
  }
}

/* ══════════════════════════════════════════
   INITIALIZATION
══════════════════════════════════════════ */
loadEvents();
setInterval(loadEvents, 30000); // Reload every 30 seconds
