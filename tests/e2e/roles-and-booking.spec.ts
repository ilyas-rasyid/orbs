import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_PASSWORD;
const loginAccounts = {
  employee: "employee@northstar.example",
  manager: "manager@northstar.example",
  admin: "admin@northstar.example",
};

async function signIn(page: Page, email: string) {
  if (!password) throw new Error("SEED_PASSWORD is required for synthetic E2E tests.");

  await page.goto("/");
  await page.getByLabel("Email kantor").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function nextWorkingDay(minOffset = 1): string {
  const timezone = "Asia/Makassar";
  for (let offset = minOffset; offset <= minOffset + 8; offset += 1) {
    const date = new Date(Date.now() + offset * 86_400_000);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    const iso = `${value("year")}-${value("month")}-${value("day")}`;
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(date);
    if (!["Sat", "Sun"].includes(weekday)) return iso;
  }
  throw new Error("Unable to find a working day within the booking horizon.");
}

function localTimeFromOffset(minutesOffset: number): string {
  const timezone = "Asia/Makassar";
  const date = new Date(Date.now() + minutesOffset * 60_000);
  date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 15) * 15, 0, 0);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

test("employee navigation excludes protected administration", async ({ page }) => {
  await signIn(page, loginAccounts.employee);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);

  await page.goto("/admin/users");
  await expect(page.getByText(/Admin role required/i)).toBeVisible();
});

test("employee books a meeting room and opens the persisted booking", async ({ page }) => {
  await signIn(page, loginAccounts.employee);
  await page.goto("/bookings/new");
  await page
    .getByLabel("Facility", { exact: true })
    .selectOption({ label: "Meeting Room A · Meeting Room · Head Office" });
  const day = nextWorkingDay();
  const hour = String(9 + Math.floor(Math.random() * 7)).padStart(2, "0");
  const endHour = String(Number(hour) + 1).padStart(2, "0");
  await page.getByLabel("Start (local time)").fill(`${day}T${hour}:00`);
  await page.getByLabel("End (local time)").fill(`${day}T${endHour}:00`);
  await page.getByLabel("Purpose").fill("Weekly resource planning");
  await page.getByLabel("Meeting title").fill("Weekly coordination");
  await page.getByRole("button", { name: /confirm booking/i }).click();

  await expect(page.getByText("Booking confirmed")).toBeVisible();
  await page.getByRole("link", { name: "View booking details" }).click();
  await expect(page.getByText("Weekly resource planning")).toBeVisible();
});

test("employee requests equipment, manager approves, hands over, and completes return", async ({
  page,
}) => {
  const uniquePurpose = `Equipment presentation ${Date.now()}`;
  await signIn(page, loginAccounts.employee);
  await page.goto("/bookings/new");
  await page
    .getByLabel("Facility", { exact: true })
    .selectOption({ label: "Projector 01 · Equipment · Head Office" });
  const startLocal = localTimeFromOffset(15);
  const endLocal = localTimeFromOffset(120);
  await page.getByLabel("Start (local time)").fill(startLocal);
  await page.getByLabel("End (local time)").fill(endLocal);
  await page.getByLabel("Purpose").fill(uniquePurpose);
  await page.getByRole("button", { name: /submit request/i }).click();

  await expect(page.getByText("Menunggu persetujuan")).toBeVisible();
  const detailHref = await page
    .getByRole("link", { name: "View booking details" })
    .getAttribute("href");
  expect(detailHref).toBeTruthy();

  await page.getByRole("button", { name: "Sign out" }).click();
  const confirmSignout = page.getByRole("button", { name: "Sign out" }).last();
  if (await confirmSignout.isVisible()) {
    await confirmSignout.click();
  }
  await signIn(page, loginAccounts.manager);
  await page.goto(detailHref!);

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("button", { name: "Confirm handover" })).toBeVisible();

  await page.getByRole("button", { name: "Confirm handover" }).click();
  await expect(page.getByRole("button", { name: "Complete return" })).toBeVisible();

  await page.getByLabel("Damage / return notes").fill("Returned in good condition");
  await page.getByRole("button", { name: "Complete return" }).click();
  await expect(page.getByText("This booking is closed. Its history is preserved.")).toBeVisible();
});

test("facility manager schedules maintenance and views reports", async ({ page }) => {
  await signIn(page, loginAccounts.manager);
  await expect(page.getByRole("link", { name: "Approvals" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Handover & Return" })).toBeVisible();

  await page.goto("/operations/maintenance");
  await page.getByRole("button", { name: /schedule maintenance/i }).click();
  await page.getByLabel("Facility").selectOption({ label: "Conference Room B" });
  const maintDay = nextWorkingDay(3);
  const maintHour = String(10 + Math.floor(Math.random() * 5)).padStart(2, "0");
  const maintEndHour = String(Number(maintHour) + 1).padStart(2, "0");
  await page.getByLabel("Reason").fill(`HVAC filter inspection ${Date.now()}`);
  await page.getByLabel("Start").fill(`${maintDay}T${maintHour}:00`);
  await page.getByLabel("End").fill(`${maintDay}T${maintEndHour}:00`);
  await page.locator("form").getByRole("button", { name: "Schedule maintenance" }).click();
  await expect(page.getByText("Maintenance scheduled.")).toBeVisible();

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
});

test("admin sees user management and organization settings", async ({ page }) => {
  await signIn(page, loginAccounts.admin);
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  await page.goto("/admin/users");
  await expect(page.getByText("admin@northstar.example")).toBeVisible();
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});
