describe("fifo cron job", () => {
  let startFifoCron;
  let cron;
  let Op;
  let LeitnerCard;
  let sequelize;

  beforeEach(() => {
    jest.resetModules();

    jest.doMock(
      "node-cron",
      () => ({
        schedule: jest.fn(),
      }),
      { virtual: true }
    );

    jest.doMock("sequelize", () => ({
      Op: { lte: Symbol.for("lte") },
    }));

    jest.doMock("../../models", () => ({
      LeitnerCard: {
        update: jest.fn(),
      },
      instance: {
        transaction: jest.fn(),
      },
    }));

    ({ startFifoCron } = require("../../jobs/fifo.cron"));
    cron = require("node-cron");
    ({ Op } = require("sequelize"));
    ({ LeitnerCard, instance: sequelize } = require("../../models"));

    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should schedule cron every minute in UTC", () => {
    startFifoCron();

    expect(cron.schedule).toHaveBeenCalledTimes(1);

    const [pattern, callback, options] = cron.schedule.mock.calls[0];

    expect(pattern).toBe("*/1 * * * *");
    expect(typeof callback).toBe("function");
    expect(options).toEqual({ timezone: "UTC" });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("[fifo-cron]")
    );
  });

  test("should activate eligible cards and commit transaction", async () => {
    const tx = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    sequelize.transaction.mockResolvedValue(tx);
    LeitnerCard.update.mockResolvedValue([2]);

    startFifoCron();
    const callback = cron.schedule.mock.calls[0][1];
    await callback();

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(LeitnerCard.update).toHaveBeenCalledTimes(1);

    const [payload, query] = LeitnerCard.update.mock.calls[0];

    expect(payload).toEqual({ fifo: true });
    expect(query.transaction).toBe(tx);
    expect(query.where.fifo).toBe(false);
    expect(query.where.dateTimeFifo[Op.lte]).toBeInstanceOf(Date);
    expect(tx.commit).toHaveBeenCalledTimes(1);
    expect(tx.rollback).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log.mock.calls[1][0]).toContain("2");
  });

  test("should rollback transaction when update fails", async () => {
    const tx = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    const error = new Error("DB update failed");

    sequelize.transaction.mockResolvedValue(tx);
    LeitnerCard.update.mockRejectedValue(error);

    startFifoCron();
    const callback = cron.schedule.mock.calls[0][1];
    await callback();

    expect(tx.commit).not.toHaveBeenCalled();
    expect(tx.rollback).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("[fifo-cron] Erreur:", error);
  });

  test("should skip overlapping execution when already running", async () => {
    const tx = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    let resolveUpdate;

    sequelize.transaction.mockResolvedValue(tx);
    LeitnerCard.update
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          })
      )
      .mockResolvedValue([0]);

    startFifoCron();
    const callback = cron.schedule.mock.calls[0][1];

    const firstRun = callback();
    const secondRun = callback();

    await secondRun;
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(LeitnerCard.update).toHaveBeenCalledTimes(1);

    resolveUpdate([0]);
    await firstRun;

    await callback();
    expect(sequelize.transaction).toHaveBeenCalledTimes(2);
  });
});
