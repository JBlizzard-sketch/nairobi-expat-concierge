import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import relocationsRouter from "./relocations";
import housingRouter from "./housing";
import schoolsRouter from "./schools";
import vendorsRouter from "./vendors";
import dashboardRouter from "./dashboard";
import documentsRouter from "./documents";
import expensesRouter from "./expenses";
import caseNotesRouter from "./caseNotes";
import alertsRouter from "./alerts";
import searchRouter from "./search";
import reportsRouter from "./reports";
import taskTemplatesRouter from "./taskTemplates";
import { invoicesRouter } from "./invoices";
import { statusRouter } from "./status";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(relocationsRouter);
router.use(housingRouter);
router.use(schoolsRouter);
router.use(vendorsRouter);
router.use(dashboardRouter);
router.use(documentsRouter);
router.use(expensesRouter);
router.use(caseNotesRouter);
router.use(alertsRouter);
router.use(searchRouter);
router.use(reportsRouter);
router.use(taskTemplatesRouter);
router.use(invoicesRouter);
router.use(statusRouter);

export default router;
