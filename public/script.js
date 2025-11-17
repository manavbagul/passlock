const API = "/api/entries";

// Helper: Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

// Toggle password visibility
function togglePass(e) {
  const span = e.target.closest(".pass").querySelector("span");
  span.textContent =
    span.textContent === "••••••••" ? span.dataset.pass : "••••••••";
}

// Load entries
async function loadEntries() {
  const res = await fetch(API);
  const entries = await res.json();
  const container = document.getElementById("entries");
  const search = document.getElementById("search").value.toLowerCase();

  container.innerHTML = entries
    .map((e, i) => {
      if (
        search &&
        !e.app.toLowerCase().includes(search) &&
        !e.user.toLowerCase().includes(search)
      )
        return "";
      return `
        <div class="entry">
          <strong>${e.app}</strong>
          <span>${e.user}</span>
          <div class="pass">
            <span data-pass="${e.pass}">••••••••</span>
            <button onclick="togglePass(event)" title="Show">View</button>
            <button onclick="copyToClipboard('${e.pass}')" title="Copy">Copy</button>
          </div>
          <div class="entry-actions">
            <button onclick="editEntry(${i})">Edit</button>
            <button onclick="deleteEntry(${i})" style="color:#cf6679;">Delete</button>
          </div>
        </div>`;
    })
    .join("");
}

// Add or Update Entry
async function saveEntry(isEdit = false, index = null) {
  const app = document.getElementById("app").value.trim();
  const user = document.getElementById("user").value.trim();
  const pass = document.getElementById("pass").value;

  if (!app || !user || !pass) return alert("All fields required");

  const method = isEdit ? "PUT" : "POST";
  const url = isEdit ? `${API}/${index}` : API;

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app, user, pass }),
  });
  closeModal();
  loadEntries();
}

// Delete
async function deleteEntry(index) {
  if (!confirm("Delete this entry?")) return;
  await fetch(`${API}/${index}`, { method: "DELETE" });
  loadEntries();
}

// Edit
function editEntry(index) {
  fetch(API)
    .then((r) => r.json())
    .then((entries) => {
      const e = entries[index];
      document.getElementById("app").value = e.app;
      document.getElementById("user").value = e.user;
      document.getElementById("pass").value = e.pass;
      window.currentEditIndex = index;
      document.getElementById("saveBtn").onclick = () => saveEntry(true, index);
      document.getElementById("modal").style.display = "block";
    });
}

// Modal
function openAddModal() {
  document.getElementById("app").value = "";
  document.getElementById("user").value = "";
  document.getElementById("pass").value = "";
  window.currentEditIndex = null;
  document.getElementById("saveBtn").onclick = () => saveEntry();
  document.getElementById("modal").style.display = "block";
}
function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// Password Generator
function generatePassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  document.getElementById("generated").textContent = pass;
  document.getElementById("pass").value = pass;
}

// Manual validation
function validateManual() {
  const pass = document.getElementById("manualPass").value;
  const hasNum = /\d/.test(pass);
  const hasSym = /[!@#$%^&*]/.test(pass);
  const longEnough = pass.length >= 8;
  if (hasNum && hasSym && longEnough) {
    document.getElementById("pass").value = pass;
    alert("Valid! Saved below.");
  } else {
    alert("Password must be 8+ chars, include number and symbol.");
  }
}

// Sign In / Sign Up Forms
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.includes("signup.html")) {
    document
      .getElementById("signupForm")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const res = await fetch("/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
        });
        const data = await res.json();
        if (data.success) window.location.href = "/index.html";
        else
          document.getElementById("error").textContent =
            data.message || "Error";
      });
  }

  if (path.includes("index.html")) {
    document
      .getElementById("signinForm")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const res = await fetch("/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
        });
        const data = await res.json();
        if (data.success) window.location.href = "/manager.html";
        else
          document.getElementById("error").textContent = "Invalid credentials";
      });
  }

  if (path.includes("generator.html")) {
    document.getElementById("generateBtn").onclick = generatePassword;
    document.getElementById("useManual").onclick = validateManual;
    document.getElementById("saveGenBtn").onclick = () => {
      const app = prompt("App Name:");
      const user = prompt("Username:");
      if (app && user) {
        fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app,
            user,
            pass: document.getElementById("pass").value,
          }),
        }).then(() => alert("Saved!"));
      }
    };
  }

  if (path.includes("manager.html")) {
    document.getElementById("search").oninput = loadEntries;
    document.getElementById("addBtn").onclick = openAddModal;
    loadEntries();
  }
});
