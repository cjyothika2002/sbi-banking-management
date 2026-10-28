
const $ = (id) => document.getElementById(id);
const KEY = "sbi_smartbank_demo_customers";

const demoCustomers = [
  {
    id: "c1",
    name: "Rahul Kumar",
    accountNumber: "SBI-DEMO-1001",
    email: "rahul@example.com",
    phone: "9000000001",
    accountType: "Savings",
    balance: 25000,
    username: "user1",
    password: "user123"
  }
];

let customers = loadCustomers();
let currentUser = null;
let toastTimer;

function loadCustomers() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === null) {
      localStorage.setItem(KEY, JSON.stringify(demoCustomers));
      return [...demoCustomers];
    }

    const data = JSON.parse(saved);
    if (!Array.isArray(data)) return [...demoCustomers];

    return data.filter(c =>
      c && typeof c.id === "string" &&
      typeof c.name === "string" &&
      typeof c.accountNumber === "string" &&
      typeof c.email === "string" &&
      typeof c.phone === "string" &&
      typeof c.username === "string" &&
      typeof c.password === "string" &&
      ["Savings", "Current", "Fixed Deposit"].includes(c.accountType) &&
      typeof c.balance === "number" &&
      Number.isFinite(c.balance) && c.balance >= 0
    );
  } catch {
    return [...demoCustomers];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(customers));
    return true;
  } catch {
    notify("Could not save changes in browser storage.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value);
}

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// DEMO AUTHENTICATION
$("loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const role = $("role").value;
  const username = $("username").value.trim();
  const password = $("password").value;
  let account = null;

  if (role === "admin") {
    if (username === "admin" && password === "admin123") {
      account = { role: "admin", name: "SBI Administrator" };
    }
  } else {
    account = customers.find(c =>
      c.username === username && c.password === password
    );

    if (account) {
      account = { ...account, role: "user" };
    }
  }

  if (!account) {
    $("loginError").textContent =
      "Invalid username, password, or login type.";
    return;
  }

  currentUser = account;
  $("loginError").textContent = "";
  $("loginPage").hidden = true;
  $("appPage").hidden = false;

  setupDashboard();
});



function setupDashboard() {
  const isAdmin = currentUser.role === "admin";

  $("sideName").textContent = currentUser.name;
  $("sideRole").textContent = isAdmin ? "Administrator" : "Customer";
  $("roleChip").textContent = isAdmin ? "ADMIN" : "USER";
  $("welcomeTitle").textContent = isAdmin
    ? "Admin Dashboard"
    : `Welcome, ${currentUser.name}`;

  $("welcomeText").textContent = isAdmin
    ? "Manage customer accounts and records."
    : "View your personal demo account information.";

  $("manageNav").hidden = !isAdmin;
  $("newNav").hidden = !isAdmin;
  $("customerFormSection").hidden = !isAdmin;
  $("management").hidden = !isAdmin;
  $("personalAccount").hidden = isAdmin;

  $("directoryTitle").textContent = "Customer Directory";
  $("actionHeader").hidden = !isAdmin;

  resetForm();
  renderAll();
}

function renderAll() {
  renderDashboard();

  if (currentUser.role === "admin") {
    renderCustomers();
  } else {
    renderPersonalAccount();
  }
}

function renderDashboard() {
  const isAdmin = currentUser.role === "admin";

  // Users see their own balance, not other customers' totals.
  const visible = isAdmin
    ? customers
    : customers.filter(c => c.id === currentUser.id);

  const total = visible.reduce((sum, c) => sum + c.balance, 0);
  const types = new Set(visible.map(c => c.accountType));

  $("totalCustomers").textContent = isAdmin
    ? customers.length
    : visible.length;

  $("totalBalance").textContent = money(total);
  $("accountTypes").textContent = types.size;

  document.querySelector(".stats").style.display = "grid";
}

function renderPersonalAccount() {
  const c = customers.find(item => item.id === currentUser.id);

  if (!c) {
    logout();
    notify("This customer account no longer exists.");
    return;
  }

  $("myBalance").textContent = money(c.balance);
  $("myAccountNumber").textContent = c.accountNumber;
  $("myName").textContent = c.name;
  $("myEmail").textContent = c.email;
  $("myPhone").textContent = c.phone;
  $("myType").textContent = c.accountType;

  // Refresh profile details after an admin edit.
  currentUser = { ...c, role: "user" };
  $("sideName").textContent = c.name;
  $("welcomeTitle").textContent = `Welcome, ${c.name}`;
}

function renderCustomers() {
  const query = $("searchInput").value.trim().toLowerCase();
  const type = $("filterType").value;

  const filtered = customers.filter(c => {
    const matches = [
      c.name, c.accountNumber, c.email, c.username
    ].some(v => v.toLowerCase().includes(query));

    return matches && (type === "All" || c.accountType === type);
  });

  $("recordCount").textContent =
    `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

  $("customerTable").innerHTML = filtered.map(c => `
    <tr>
      <td>
        <strong>${escapeHTML(c.name)}</strong>
        <small>${escapeHTML(c.email)}</small>
      </td>
      <td>${escapeHTML(c.accountNumber)}</td>
      <td><span class="type-pill">${escapeHTML(c.accountType)}</span></td>
      <td class="balance">${money(c.balance)}</td>
      <td>
        <div class="row-actions">
          <button class="row-btn edit" data-action="edit"
            data-id="${escapeHTML(c.id)}">Edit</button>
          <button class="row-btn delete" data-action="delete"
            data-id="${escapeHTML(c.id)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  $("emptyMessage").hidden = filtered.length > 0;
}

function resetForm() {
  $("customerForm").reset();
  $("customerId").value = "";
  $("formTitle").textContent = "Create Customer";
  $("formMode").textContent = "CREATE";
  $("saveBtn").textContent = "Create Customer";
  $("cancelBtn").hidden = true;
  $("loginPassword").required = true;
  $("loginPassword").placeholder = "Set password for new customer";
}

function usernameExists(username, exceptId = "") {
  return customers.some(c =>
    c.username.toLowerCase() === username.toLowerCase() &&
    c.id !== exceptId
  );
}

// CREATE + UPDATE
$("customerForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!currentUser || currentUser.role !== "admin") return;

  const id = $("customerId").value;
  const name = $("name").value.trim();
  const accountNumber = $("accountNumber").value.trim();
  const email = $("email").value.trim();
  const phone = $("phone").value.trim();
  const accountType = $("accountType").value;
  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value;
  const balance = Number($("balance").value);

  if (!name || !accountNumber || !email || !phone || !username) {
    notify("Please complete all required fields.");
    return;
  }

  if (
    !Number.isFinite(balance) || balance < 0 ||
    balance > 1000000000 ||
    !["Savings", "Current", "Fixed Deposit"].includes(accountType)
  ) {
    notify("Please enter a valid account type and balance.");
    return;
  }

  const existing = customers.find(c => c.id === id);

  if (id && !existing) {
    notify("Customer record not found.");
    resetForm();
    return;
  }

  if (
    customers.some(c =>
      c.accountNumber.toLowerCase() === accountNumber.toLowerCase() &&
      c.id !== id
    )
  ) {
    notify("Account number already exists.");
    return;
  }

  if (usernameExists(username, id)) {
    notify("Username already exists. Choose another.");
    return;
  }

  if (!id && password.length < 6) {
    notify("New customer passwords need at least 6 characters.");
    return;
  }

  if (id && password && password.length < 6) {
    notify("Password must have at least 6 characters.");
    return;
  }

  const record = {
    id: id || (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    ),
    name,
    accountNumber,
    email,
    phone,
    accountType,
    balance,
    username,
    password: password || existing?.password || ""
  };

  const oldCustomers = customers;

  customers = id
    ? customers.map(c => c.id === id ? record : c)
    : [...customers, record];

  if (!persist()) {
    customers = oldCustomers;
    return;
  }

  resetForm();
  renderAll();
  notify(id ? "Customer updated successfully." : "Customer created successfully.");
});

// EDIT + DELETE: delegated click handling
$("customerTable").addEventListener("click", event => {
  if (!currentUser || currentUser.role !== "admin") return;

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const customer = customers.find(c => c.id === id);
  if (!customer) return;

  if (button.dataset.action === "edit") {
    $("customerId").value = customer.id;
    $("name").value = customer.name;
    $("accountNumber").value = customer.accountNumber;
    $("email").value = customer.email;
    $("phone").value = customer.phone;
    $("accountType").value = customer.accountType;
    $("balance").value = customer.balance;
    $("loginUsername").value = customer.username;
    $("loginPassword").value = "";

    $("loginPassword").required = false;
    $("loginPassword").placeholder = "Leave blank to keep current password";
    $("formTitle").textContent = "Update Customer";
    $("formMode").textContent = "EDIT MODE";
    $("saveBtn").textContent = "Save Changes";
    $("cancelBtn").hidden = false;

    $("customerFormSection").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete ${customer.name} (${customer.accountNumber})?`)) {
      return;
    }

    const oldCustomers = customers;
    customers = customers.filter(c => c.id !== id);

    if (!persist()) {
      customers = oldCustomers;
      return;
    }

    if ($("customerId").value === id) resetForm();

    renderAll();
    notify("Customer deleted successfully.");
  }
});

$("cancelBtn").addEventListener("click", resetForm);
$("searchInput").addEventListener("input", renderCustomers);
$("filterType").addEventListener("change", renderCustomers);

$("newNav").addEventListener("click", event => {
  if (currentUser?.role !== "admin") {
    event.preventDefault();
    return;
  }

  resetForm();
  $("customerFormSection").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

$("logoutBtn").addEventListener("click", logout);
$("topLogout").addEventListener("click", logout);

function logout() {
  currentUser = null;
  $("appPage").hidden = true;
  $("loginPage").hidden = false;
  $("loginForm").reset();
  $("loginError").textContent = "";
  $("password").value = "";
}

renderAll();
