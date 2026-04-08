import { Config, ProviderState, Segment, StatuslineContext, WidgetId } from "../types.js";
import { contextWidget } from "./context.js";
import { cwdWidget } from "./cwd.js";
import { gitWidget } from "./git.js";
import { modelWidget } from "./model.js";
import { sessionWidget } from "./session.js";

type WidgetFactory = (input: StatuslineContext, providers: ProviderState) => Segment | undefined;

const registry: Record<WidgetId, WidgetFactory> = {
  model: (input) => modelWidget(input),
  cwd: (input) => cwdWidget(input),
  git: (_, providers) => gitWidget(providers.git),
  context: (input, providers) => contextWidget(input, providers.transcript),
  session: (_, providers) => sessionWidget(providers.session, providers.transcript)
};

export function buildSegments(
  input: StatuslineContext,
  providers: ProviderState,
  config: Config
): Segment[] {
  return config.widgets
    .map((widgetId) => registry[widgetId](input, providers))
    .filter((segment): segment is Segment => Boolean(segment));
}
