import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import relocationsRouter from "./relocations";
import housingRouter from "./housing";
import schoolsRouter from "./schools";
import vendorsRouter from "./vendors";
import dashboardRouter from "./dashboard";
import documentsRouter from "./documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(relocationsRouter);
router.use(housingRouter);
router.use(schoolsRouter);
router.use(vendorsRouter);
router.use(dashboardRouter);
router.use(documentsRouter);

export default router;
