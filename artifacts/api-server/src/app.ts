import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { ensureCompanies } from "./lib/company-context";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Invoice PDF emails send base64 payloads; keep headroom above logo settings uploads.
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(async (_req, _res, next) => {
  try {
    await ensureCompanies();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api", router);

export default app;
