function zonedParts(date, timeZone = "") {
  if (!timeZone) {
    return {
      dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      hour: date.getHours()
    };
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour || 0)
  };
}

function startScheduler({ scanFn, scanHour = 8, runOnBoot = false, timeZone = "", initialLastRunDate = "", onLastRunDate = null }) {
  let running = false;
  let lastRunDate = String(initialLastRunDate || "");

  async function maybeRun(reason) {
    if (running) {
      return;
    }

    const now = new Date();
    const zoned = zonedParts(now, timeZone);
    const today = zoned.dateKey;
    const shouldRunByHour = zoned.hour >= scanHour && lastRunDate !== today;

    if (reason !== "boot" && !shouldRunByHour) {
      return;
    }

    running = true;
    try {
      await scanFn({ mode: reason === "boot" ? "boot" : "scheduled" });
      lastRunDate = today;
      if (typeof onLastRunDate === "function") onLastRunDate(lastRunDate);
    } finally {
      running = false;
    }
  }

  const timer = setInterval(() => {
    maybeRun("scheduled").catch(() => {});
  }, 15 * 60 * 1000);

  if (runOnBoot) {
    setTimeout(() => {
      maybeRun("boot").catch(() => {});
    }, 1200);
  }

  return {
    stop() {
      clearInterval(timer);
    },
    status() {
      return {
        running,
        lastRunDate,
        scanHour,
        timeZone
      };
    }
  };
}

module.exports = {
  startScheduler,
  zonedParts
};
