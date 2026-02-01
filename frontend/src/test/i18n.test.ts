// Copyright 2026 Roman F
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { beforeEach, describe, expect, test } from "bun:test";
import i18next from "i18next";
import { setupI18n, TRANSLATIONS } from "../i18n";

describe("i18n", () => {
  beforeEach(() => {
    // Reset i18next instance and localStorage before each test
    i18next.changeLanguage("en-GB");
    localStorage.clear();
  });

  test("translations are complete across all languages", () => {
    const languages = Object.keys(
      TRANSLATIONS,
    ) as (keyof typeof TRANSLATIONS)[];
    const enKeys = Object.keys(TRANSLATIONS["en-GB"].translation).sort();

    for (const lang of languages) {
      const langKeys = Object.keys(TRANSLATIONS[lang].translation).sort();
      expect(langKeys).toEqual(enKeys);

      // Also ensure no empty strings
      for (const key of langKeys) {
        const value = (
          TRANSLATIONS[lang].translation as Record<string, string>
        )[key];
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  test("setupI18n detects language from localStorage", () => {
    localStorage.setItem("language", "de");
    setupI18n();
    expect(i18next.language).toBe("de");
  });

  test("setupI18n detects language from navigator if localStorage is empty", () => {
    // Mock navigator.languages and navigator.language
    Object.defineProperty(window.navigator, "languages", {
      value: ["ja"],
      configurable: true,
    });
    Object.defineProperty(window.navigator, "language", {
      value: "ja",
      configurable: true,
    });

    setupI18n();
    expect(i18next.language).toBe("ja");
  });
});
