import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import productsRouter from "./products";
import invoicesRouter from "./invoices";
import settingsRouter from "./settings";
import companiesRouter from "./companies";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(invoicesRouter);
router.use(settingsRouter);
router.use(companiesRouter);

export default router;
