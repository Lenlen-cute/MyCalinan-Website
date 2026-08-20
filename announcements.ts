interface AnnouncementItem {
    id?: string | number;
    title: string;
    description: string;
    category?: string;
    date?: string;
    image?: string;
}

const API_URL = "http://localhost:5000/api/announcements";

function escapeHtml(text: string | null | undefined): string {
    if (text == null) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadAnnouncements(): Promise<void> {
    const container = document.getElementById("announcementContainer") as HTMLElement | null;
    if (!container) return;

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Server error");
        }

        const announcements: AnnouncementItem[] = await response.json();

        if (!announcements || !announcements.length) {
            container.innerHTML = `
                <div class="empty">
                    No announcements available.
                </div>
            `;
            return;
        }

        let html = `<div class="announcement-grid">`;

        announcements.forEach((item) => {
            html += `
                <div class="card">
                    ${
                        item.image
                            ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">`
                            : ""
                    }
                    <div class="card-content">
                        <span class="category">
                            ${escapeHtml(item.category || "General")}
                        </span>
                        <div class="title">
                            ${escapeHtml(item.title)}
                        </div>
                        <div class="date">
                            <i class="fas fa-calendar"></i>
                            ${escapeHtml(item.date || "No date")}
                        </div>
                        <div class="description">
                            ${escapeHtml(item.description)}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="empty">
                ⚠ Unable to load announcements.<br>
                Make sure Flask is running on port 5000.
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadAnnouncements();
    setInterval(loadAnnouncements, 30000);
});
