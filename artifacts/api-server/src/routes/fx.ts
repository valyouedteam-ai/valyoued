import { Router, type IRouter } from "express";
import { GetFxRatesResponse } from "@workspace/api-zod";
import { getFxRateSnapshot } from "../lib/fxRates";

const router: IRouter = Router();

router.get("/fx/rates", async (_req, res): Promise<void> => {
  const s = await getFxRateSnapshot();
  res.json(
    GetFxRatesResponse.parse({
      source: s.source,
      asOf: s.asOf,
      fetchedAt: s.fetchedAt,
      rates: s.rates,
    }),
  );
});

export default router;
