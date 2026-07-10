function startScheduler({ scanFn, scanHour = 8, runOnBoot = false }) {
  let running = false;
  let lastRunDate = "";

  async function maybeRun(reason) {
    if (running) {
      return;
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const shouldRunByHour = now.getHours() >= scanHour && lastRunDate !== today;

    if (reason !== "boot" && !shouldRunByHour) {
      return;
    }

    running = true;
    try {
      await scanFn({ mode: reason === "boot" ? "boot" : "scheduled" });
      lastRunDate = today;
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
        scanHour
      };
    }
  };
}

module.exports = {
  startScheduler
};
