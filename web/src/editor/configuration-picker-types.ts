/** Defines the configuration picker input and rendered-content contracts. */
import type { RefObject } from "react";
import type { AppleCompatSetting } from "../../../src/apple-compat.js";
import type { AppleSchemaEntry } from "../../../src/apple-schema.js";
import type { ConfigurationTemplate } from "../../../src/templates.js";
import type { ConfigurationOption, ConfigurationOptionGroup } from "./AddConfigurationControl.js";
import type { AddGroup } from "./types.js";

export interface ConfigurationPickerModalProps {
  readonly availableTemplates: readonly ConfigurationTemplate[];
  readonly presentNativeTypes: readonly string[];
  readonly availableAppleCompatSettings: readonly AppleCompatSetting[];
  readonly availableAppleSchemaProfiles: readonly AppleSchemaEntry[];
  readonly customSettingsAvailable: boolean;
  readonly selectedType: string;
  readonly query: string;
  readonly group: AddGroup;
  readonly onSelectedTypeChange: (value: string) => void;
  readonly onQueryChange: (value: string) => void;
  readonly onGroupChange: (value: AddGroup) => void;
  readonly onAdd: () => void;
  readonly onClose: () => void;
}

export interface ConfigurationPickerContentProps {
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly query: string;
  readonly group: AddGroup;
  readonly customSettingsAvailable: boolean;
  readonly allOptions: readonly ConfigurationOption[];
  readonly filtered: readonly ConfigurationOption[];
  readonly groups: readonly ConfigurationOptionGroup[];
  readonly selectedType: string;
  readonly onQueryChange: (value: string) => void;
  readonly onGroupChange: (value: AddGroup) => void;
  readonly onSelectedTypeChange: (value: string) => void;
  readonly onAdd: () => void;
  readonly onClose: () => void;
}
