import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import productsRouter from "./products";
import invoicesRouter from "./invoices";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(invoicesRouter);

export default router;
