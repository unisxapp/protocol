// The logger has a four different levels based on the severity of the incident:
// -> Debug. It can be considered a console log. Used periodically to inform status updates of repetitive state changes
//    like polling or no events found. Only viewable on GCE logs.
// -> Info. Used to report informative events, like a  liquidation/dispute/dispute settlement. These events are
//    noteworthy but don’t require action or acknowledgment from any
//    team member. Viewable on GCE logs and sends a slack message to appropriate channels.
// -> Warn. Used to report warning events that might require a response but don't necessarily indicate system failure.
//    Require Acknowledgment from the person on duty, or escalation occurs until the warning is acknowledged. For
//    example, warnings would be used to indicate that a bot’s balance has dropped below a given threshold or a
//    collateralization ratio of a given account moves below a threshold. Viewable on GCE logs, send a slack message to
//    the appropriate channel and initiates a PagerDuty incident with urgency set ‘low’.
// -> Error. Used to report system failure or situations that require an immediate response from appropriate team members.
//    For example, an error level message is generated when a liquidation/dispute/dispute settlement transaction from a UMA
//    bot reverts, token price deviates significantly from the target price or a bot crashes. Viewable on GCE logs, send a
//    slack message to the appropriate channel and initiates a PagerDuty incident with urgency setting ‘high’.

// calling debug/info/error logging requires an specificity formatted json object as a param for the logger.
// All objects must have an `at`, `message` as a minimum to describe where the error was logged from
// and what has occurred. Any addition key value pairing can be attached, including json objects which
// will be spread. A transaction should be within an object that contains a `tx` key containing the mined
// transaction hash. See `liquidator.js` for an example. An example object is shown below:

// Logger.error({
//   at: "liquidator",
//   message: "failed to withdraw rewards from liquidation",
//   address: liquidation.sponsor,
//   id: liquidation.id
// });

import winston from "winston";
import type { Logger as _Logger, LogEntry } from "winston";
import type * as Transport from "winston-transport";
import { createTransports } from "./Transports";

// This async function can be called by a bot if the log message is generated right before the process terminates.
// By calling `await waitForLogger(Logger)`, with the local Logger instance, the process will wait for all upstream
// transports to clear. This enables slower transports like slack to still send their messages before the process yields.
// Note: typescript infers the return tyoe to be unknown. This is fine, as the return type should be void and unused.
export async function waitForLogger(logger: _Logger): Promise<unknown> {
  const loggerDone = new Promise((resolve) => logger.on("finish", resolve));
  logger.end();
  return await loggerDone;
}

// If the log entry contains an error then extract the stack trace as the error message.
function errorStackTracerFormatter(logEntry: LogEntry) {
  if (logEntry.error) {
    logEntry.error = handleRecursiveErrorArray(logEntry.error);
  }
  return logEntry;
}

// Handle case where `error` is an array of errors and we want to display all of the error stacks recursively.
// i.e. `error` is in the shape: [[Error, Error], [Error], [Error, Error]]
function handleRecursiveErrorArray(error: Error | any[]): string | any[] {
  // If error is not an array, then just return error information for there is no need to recurse further.
  if (!Array.isArray(error)) return error.stack || error.message || error.toString() || "could not extract error info";
  // Recursively add all errors to an array and flatten the output.
  return error.map(handleRecursiveErrorArray).flat();
}

// This formatter checks if the `BOT_IDENTIFIER` env variable is present. If it is, the name is appended to the message.
function botIdentifyFormatter(botIdentifier: string) {
  return function (logEntry: LogEntry) {
    if (botIdentifier) logEntry["bot-identifier"] = botIdentifier;
    return logEntry;
  };
}

export function createNewLogger(
  injectedTransports: Transport[] = [],
  transportsConfig = {},
  botIdentifier = process.env.BOT_IDENTIFIER || "NO_BOT_ID"
): _Logger {
  return winston.createLogger({
    level: "debug",
    format: winston.format.combine(
      winston.format(botIdentifyFormatter(botIdentifier))(),
      winston.format((logEntry) => logEntry)(),
      winston.format(errorStackTracerFormatter)(),
      winston.format.json()
    ),
    transports: [...createTransports(transportsConfig), ...injectedTransports],
    exitOnError: !!process.env.EXIT_ON_ERROR,
  });
}

export const Logger = createNewLogger();
