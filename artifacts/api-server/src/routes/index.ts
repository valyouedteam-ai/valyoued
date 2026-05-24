import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geoRouter from "./geo";
import fxRouter from "./fx";
import portfoliosRouter from "./portfolios";
import estimatesRouter from "./estimates";
import visionRouter from "./vision";
import listingsRouter from "./listings";
import adminRouter from "./admin";
import meRouter from "./me";
import billingRouter from "./billing";
import deskRouter from "./desk";

const router: IRouter = Router();

router.use(healthRouter);
router.use(geoRouter);
router.use(fxRouter);
router.use(portfoliosRouter);
router.use(estimatesRouter);
router.use(visionRouter);
router.use(listingsRouter);
router.use(adminRouter);
router.use(meRouter);
router.use(deskRouter);
router.use(billingRouter);

export default router;
