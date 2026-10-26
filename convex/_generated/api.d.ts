/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as SmtpEmail from "../SmtpEmail.js";
import type * as actionLogs from "../actionLogs.js";
import type * as auth from "../auth.js";
import type * as constants from "../constants.js";
import type * as http from "../http.js";
import type * as providers from "../providers.js";
import type * as seedTestUser from "../seedTestUser.js";
import type * as serviceAccounts from "../serviceAccounts.js";
import type * as smtp from "../smtp.js";
import type * as ssoAuth from "../ssoAuth.js";
import type * as sync from "../sync.js";
import type * as testAuth from "../testAuth.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  SmtpEmail: typeof SmtpEmail;
  actionLogs: typeof actionLogs;
  auth: typeof auth;
  constants: typeof constants;
  http: typeof http;
  providers: typeof providers;
  seedTestUser: typeof seedTestUser;
  serviceAccounts: typeof serviceAccounts;
  smtp: typeof smtp;
  ssoAuth: typeof ssoAuth;
  sync: typeof sync;
  testAuth: typeof testAuth;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
