import type { Handler } from "../../../http/router.js";
import { manager } from "../../../http/router.js";
import { report, toCsv } from "../service/report.service.js";

export const getReport: Handler = async (ctx) => {
  manager(ctx);
  const type = ctx.params.type ?? "";
  const result = await report(type, ctx.query);
  return { ...result, meta: { generatedAt: new Date(), timezone: "Asia/Makassar" } };
};

export const exportReport: Handler = async (ctx) => {
  manager(ctx);
  const type = ctx.params.type ?? "";
  const result = await report(type, ctx.query);
  return new Response(toCsv(result.rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="orbs-${type}.csv"`,
    },
  });
};
