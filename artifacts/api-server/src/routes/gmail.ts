import { Router, type IRouter } from "express";
import {
  GetGmailConnectUrlResponse,
  GetGmailStatusResponse,
} from "@workspace/api-zod";
import {
  buildGmailConnectUrl,
  completeGmailOAuth,
  disconnectGmailConnection,
  getGmailConnectionStatus,
} from "../lib/gmail";
import { getGmailOAuthConfig } from "../lib/gmail/oauth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/gmail/status", async (_req, res): Promise<void> => {
  const status = await getGmailConnectionStatus();
  res.json(GetGmailStatusResponse.parse(status));
});

router.get("/gmail/connect", async (_req, res): Promise<void> => {
  try {
    const authUrl = buildGmailConnectUrl();
    res.json(GetGmailConnectUrlResponse.parse({ authUrl }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail OAuth is not configured";
    res.status(500).json({ error: message });
  }
});

router.get("/gmail/callback", async (req, res): Promise<void> => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const oauthError = typeof req.query.error === "string" ? req.query.error : null;

  let frontendUrl = "http://localhost:19044";
  try {
    frontendUrl = getGmailOAuthConfig().frontendUrl;
  } catch {
    // keep default
  }
  const settingsBase = `${frontendUrl.replace(/\/+$/, "")}/settings`;

  if (oauthError) {
    res.redirect(`${settingsBase}?gmail=error&reason=${encodeURIComponent(oauthError)}`);
    return;
  }

  if (!code) {
    res.redirect(`${settingsBase}?gmail=error&reason=${encodeURIComponent("missing_code")}`);
    return;
  }

  try {
    const redirectTo = await completeGmailOAuth(code);
    res.redirect(redirectTo);
  } catch (error) {
    logger.error({ err: error }, "Gmail OAuth callback failed");
    const message = error instanceof Error ? error.message : "oauth_failed";
    res.redirect(`${settingsBase}?gmail=error&reason=${encodeURIComponent(message)}`);
  }
});

router.delete("/gmail/disconnect", async (_req, res): Promise<void> => {
  await disconnectGmailConnection();
  res.status(204).end();
});

export default router;
