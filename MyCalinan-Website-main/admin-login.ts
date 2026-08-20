// Define interfaces for API response payloads
interface LoginSuccessPayload {
    token: string;
    username: string;
    role: string;
}

interface LoginErrorPayload {
    error?: string;
}

// Point this at wherever the Flask API actually runs.
const API_BASE_URL: string = "http://localhost:5000";

// Toggle password visibility
function togglePassword(): void {
    const passwordInput = document.getElementById("password") as HTMLInputElement | null;
    const btn = document.querySelector(".show-password") as HTMLButtonElement | null;

    if (!passwordInput || !btn) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        btn.textContent = "Hide";
    } else {
        passwordInput.type = "password";
        btn.textContent = "Show";
    }
}

// Show login error alert box
function showLoginError(message: string): void {
    const errorBox = document.getElementById("login-error") as HTMLDivElement | null;
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.style.display = "block";
}

// Hide login error alert box
function hideLoginError(): void {
    const errorBox = document.getElementById("login-error") as HTMLDivElement | null;
    if (!errorBox) return;
    errorBox.style.display = "none";
}

// Store credentials based on "Remember Me"
function storeSession(remember: boolean, payload: LoginSuccessPayload): void {
    const storage: Storage = remember ? localStorage : sessionStorage;
    storage.setItem("mycalinan_admin_token", payload.token);
    storage.setItem("mycalinan_admin_username", payload.username);
    storage.setItem("mycalinan_admin_role", payload.role);
}

// Attach Event Listeners on DOM Loaded
document.addEventListener("DOMContentLoaded", () => {
    // Attach event to Toggle Password button
    const toggleBtn = document.querySelector(".show-password") as HTMLButtonElement | null;
    if (toggleBtn) {
        toggleBtn.addEventListener("click", togglePassword);
    }

    // Attach submit event listener to Admin Login form
    const loginForm = document.getElementById("admin-login-form") as HTMLFormElement | null;

    if (loginForm) {
        loginForm.addEventListener("submit", async (e: SubmitEvent): Promise<void> => {
            e.preventDefault();
            hideLoginError();

            const usernameInput = document.getElementById("username") as HTMLInputElement | null;
            const passwordInput = document.getElementById("password") as HTMLInputElement | null;
            const rememberCheckbox = document.getElementById("remember") as HTMLInputElement | null;
            const submitBtn = document.getElementById("login-submit-btn") as HTMLButtonElement | null;

            if (!usernameInput || !passwordInput || !submitBtn) return;

            const username: string = usernameInput.value.trim();
            const password: string = passwordInput.value;
            const remember: boolean = rememberCheckbox ? rememberCheckbox.checked : false;

            if (!username || !password) {
                showLoginError("Please enter both username and password.");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Signing in...";

            try {
                const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const data: LoginSuccessPayload & LoginErrorPayload = await res.json();

                if (!res.ok) {
                    showLoginError(data.error || "Login failed. Please try again.");
                    return;
                }

                storeSession(remember, data);

                // Redirect only after the credentials have actually been verified.
                window.location.href = "Admin-Dashboard.html";

            } catch (err) {
                console.error("Admin login error:", err);
                showLoginError("Cannot connect to the server. Make sure the API is running.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Sign In";
            }
        });
    }
});