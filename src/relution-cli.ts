/** Dispatches Relution CLI actions to their command implementations. */
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import { runRelutionAssessCommand, runRelutionDevicesCommand, runRelutionTestCommand } from "./relution-cli-commands.js";
import { runRelutionAuditCommand } from "./relution-cli-audit-command.js";
import type { RelutionCliArgs } from "./relution-cli-options.js";

export async function runRelutionCliCommand(
  args: RelutionCliArgs,
  transportOptions: HttpServiceTransportOptions = {},
): Promise<void> {
  switch (args.positionals[0]) {
    case "assess":
      await runRelutionAssessCommand(args, transportOptions);
      return;
    case "audit":
      await runRelutionAuditCommand(args, transportOptions);
      return;
    case "devices":
      await runRelutionDevicesCommand(args, transportOptions);
      return;
    case "test":
      await runRelutionTestCommand(args, transportOptions);
      return;
    default:
      throw new Error("relution requires an action: test, devices, assess, or audit");
  }
}
