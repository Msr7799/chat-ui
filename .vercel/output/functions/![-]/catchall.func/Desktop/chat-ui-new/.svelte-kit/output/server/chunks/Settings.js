import { d as defaultModel } from "./models.js";
const DEFAULT_SETTINGS = {
  shareConversationsWithModelAuthors: true,
  activeModel: defaultModel.id,
  customPrompts: {},
  multimodalOverrides: {},
  toolsOverrides: {},
  hidePromptExamples: {},
  disableStream: false,
  directPaste: false
};
export {
  DEFAULT_SETTINGS as D
};
